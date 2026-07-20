import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { BALLPARKS, CWA_DATASETS } from '../src/data/ballparks.js';
import { selectOverlappingPeriods } from '../src/utils/weather.js';

const DAY = 24 * 60 * 60 * 1000;
const CWA_API_ROOT = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeIso(value, label) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${label} 時間無法解析`);
  return new Date(timestamp).toISOString();
}

function taipeiDateRange(now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const start = Date.parse(`${date}T00:00:00+08:00`);
  return {
    startDate: date,
    endDate: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(start + 7 * DAY)),
  };
}

export function selectUpcomingVenues(schedules, now = new Date()) {
  const { startDate, endDate } = taipeiDateRange(now);
  const locations = new Set(
    Object.values(schedules || {})
      .filter((game) => game?.date >= startDate && game.date < endDate)
      .map((game) => game.location)
      .filter(Boolean),
  );

  if (locations.size === 0) throw new Error('未來七個臺北日曆日內沒有可同步球場');

  const unknown = [...locations].filter((location) => !BALLPARKS[location]);
  if (unknown.length) throw new Error(`未知賽程場地：${unknown.join('、')}`);
  return [...locations];
}

export function groupVenuesByCity(venues) {
  const groups = new Map();
  for (const venue of venues) {
    const ballpark = BALLPARKS[venue];
    if (!ballpark) throw new Error(`未知賽程場地：${venue}`);
    if (!groups.has(ballpark.city)) groups.set(ballpark.city, { districts: new Set(), venues: [] });
    groups.get(ballpark.city).districts.add(ballpark.district);
    groups.get(ballpark.city).venues.push(venue);
  }
  return groups;
}

function firstValue(value, keys) {
  const item = asArray(value)[0] || {};
  for (const key of keys) {
    if (item[key] !== undefined) return item[key];
  }
  return Object.values(item).find((entry) => typeof entry !== 'object');
}

export function parseRainProbability(value) {
  if (value == null || value === '' || value === '-' || value === 'null') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    throw new Error(`降雨機率超出範圍：${value}`);
  }
  return number;
}

function parseTemperature(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getDatasetParts(payload) {
  if (payload?.success !== undefined && payload.success !== true && payload.success !== 'true') {
    throw new Error('CWA 回應失敗');
  }

  const root = payload?.records
    || payload?.cwaopendata?.dataset
    || payload?.cwaopendata?.Dataset
    || payload?.Records;
  const dataset = root?.Dataset || root?.dataset || root;
  const locations = asArray(dataset?.Locations || dataset?.locations || root?.Locations || root?.locations)[0];
  const datasetInfo = dataset?.DatasetInfo || dataset?.datasetInfo
    || root?.DatasetInfo || root?.datasetInfo
    || locations?.DatasetInfo || locations?.datasetInfo;
  const sourceIssuedAt = datasetInfo?.IssueTime || datasetInfo?.issueTime
    || root?.IssueTime || root?.issueTime
    || locations?.IssueTime || locations?.issueTime;

  if (!locations || !sourceIssuedAt) throw new Error('CWA 回應缺少 Locations 或 IssueTime');
  return { locations, sourceIssuedAt: normalizeIso(sourceIssuedAt, '發布') };
}

function elementName(element) {
  return element.ElementName || element.elementName || '';
}

function elementTimes(element) {
  return asArray(element?.Time || element?.time);
}

function findElement(elements, names) {
  return elements.find((element) => names.some((name) => elementName(element).includes(name)));
}

function periodBounds(time, nextTime, intervalHours) {
  const startAt = time.StartTime || time.startTime || time.DataTime || time.dataTime;
  const endAt = time.EndTime || time.endTime
    || nextTime?.StartTime || nextTime?.startTime || nextTime?.DataTime || nextTime?.dataTime
    || new Date(Date.parse(startAt) + intervalHours * 60 * 60 * 1000).toISOString();
  return {
    startAt: normalizeIso(startAt, '預報開始'),
    endAt: normalizeIso(endAt, '預報結束'),
  };
}

function overlappingValue(element, startAt, endAt, keys, parser = (value) => value) {
  const match = elementTimes(element).find((time, index, times) => {
    const bounds = periodBounds(time, times[index + 1], 3);
    return Date.parse(bounds.startAt) < Date.parse(endAt) && Date.parse(bounds.endAt) > Date.parse(startAt);
  });
  return match ? parser(firstValue(match.ElementValue || match.elementValue, keys)) : null;
}

function normalizePeriods(location, intervalHours) {
  const elements = asArray(location.WeatherElement || location.weatherElement);
  const weatherElement = findElement(elements, ['天氣現象', 'Wx']);
  const rainElement = findElement(elements, ['降雨機率', 'PoP']);
  const minElement = findElement(elements, ['最低溫度', 'MinT']);
  const maxElement = findElement(elements, ['最高溫度', 'MaxT']);
  if (!weatherElement || !rainElement) throw new Error(`${location.LocationName || location.locationName} 缺少天氣或降雨資料`);

  const times = elementTimes(weatherElement);
  if (times.length === 0) throw new Error(`${location.LocationName || location.locationName} 沒有預報時段`);

  return times.map((time, index) => {
    const { startAt, endAt } = periodBounds(time, times[index + 1], intervalHours);
    const weather = firstValue(time.ElementValue || time.elementValue, ['Weather', 'weather']);
    if (!weather) throw new Error(`${location.LocationName || location.locationName} 缺少天氣現象`);

    const period = {
      startAt,
      endAt,
      weather: String(weather),
      rainProbability: overlappingValue(
        rainElement,
        startAt,
        endAt,
        ['ProbabilityOfPrecipitation', 'probabilityOfPrecipitation'],
        parseRainProbability,
      ),
    };
    const minTemperature = minElement && overlappingValue(
      minElement, startAt, endAt, ['MinTemperature', 'minTemperature'], parseTemperature,
    );
    const maxTemperature = maxElement && overlappingValue(
      maxElement, startAt, endAt, ['MaxTemperature', 'maxTemperature'], parseTemperature,
    );
    if (minTemperature != null) period.minTemperature = minTemperature;
    if (maxTemperature != null) period.maxTemperature = maxTemperature;
    return period;
  });
}

export function normalizeCwaResponse(payload, intervalHours) {
  const { locations, sourceIssuedAt } = getDatasetParts(payload);
  const normalized = {};
  for (const location of asArray(locations.Location || locations.location)) {
    const locationName = location.LocationName || location.locationName;
    if (!locationName) throw new Error('CWA 回應缺少行政區名稱');
    normalized[locationName] = normalizePeriods(location, intervalHours);
  }
  if (Object.keys(normalized).length === 0) throw new Error('CWA 回應沒有行政區資料');
  return { sourceIssuedAt, locations: normalized };
}

async function fetchCwaDataset(datasetId, districts, apiKey) {
  const url = new URL(`${CWA_API_ROOT}/${datasetId}`);
  url.searchParams.set('format', 'JSON');
  url.searchParams.set('LocationName', districts.join(','));

  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new Error(`CWA ${datasetId} 請求失敗：${error.message}`);
  }
  if (!response.ok) throw new Error(`CWA ${datasetId} 回應狀態 ${response.status}`);
  return response.json();
}

export function buildWeatherSnapshot(groups, responses, fetchedAt = Date.now()) {
  const venues = {};
  const issueTimes = new Set();

  for (const [city, group] of groups) {
    const response = responses.get(city);
    if (!response) throw new Error(`${city} 缺少預報回應`);
    const shortTerm = normalizeCwaResponse(response.shortTerm, 3);
    const weekly = normalizeCwaResponse(response.weekly, 12);
    issueTimes.add(shortTerm.sourceIssuedAt);
    issueTimes.add(weekly.sourceIssuedAt);

    for (const venue of group.venues) {
      const { district } = BALLPARKS[venue];
      if (!shortTerm.locations[district] || !weekly.locations[district]) {
        throw new Error(`${venue}（${district}）缺少完整預報`);
      }
      venues[venue] = {
        locationName: district,
        shortTerm: shortTerm.locations[district],
        weekly: weekly.locations[district],
      };
    }
  }

  if (issueTimes.size !== 1) throw new Error(`資料集發布時間不一致：${[...issueTimes].join('、')}`);
  return {
    fetchedAt,
    sourceIssuedAt: [...issueTimes][0],
    status: 'ok',
    venues,
  };
}

export function getPublishUpdates(existingWeather, snapshot) {
  if (existingWeather?.sourceIssuedAt === snapshot.sourceIssuedAt) {
    return {
      'weather/fetchedAt': snapshot.fetchedAt,
      'lastSync/weather': snapshot.fetchedAt,
    };
  }
  return {
    weather: snapshot,
    'lastSync/weather': snapshot.fetchedAt,
  };
}

function createDatabase() {
  const rawCredential = process.env.FIREBASE_SERVICE_ACCOUNT_ENJOY_CPBL;
  if (!rawCredential) throw new Error('缺少 FIREBASE_SERVICE_ACCOUNT_ENJOY_CPBL');
  const serviceAccount = JSON.parse(rawCredential);
  const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
  initializeApp({ credential: cert(serviceAccount), databaseURL: config.databaseURL });
  return getDatabase();
}

async function syncWeather() {
  const apiKey = process.env.CWA_API_KEY;
  if (!apiKey) throw new Error('缺少 CWA_API_KEY');
  const database = createDatabase();
  const schedules = (await database.ref('schedules').get()).val() || {};
  const groups = groupVenuesByCity(selectUpcomingVenues(schedules));
  const responses = new Map();

  for (const [city, group] of groups) {
    const datasets = CWA_DATASETS[city];
    const districts = [...group.districts];
    if (!datasets) throw new Error(`${city} 缺少 F-D0047 資料集對照`);
    const [shortTerm, weekly] = await Promise.all([
      fetchCwaDataset(datasets.shortTerm, districts, apiKey),
      fetchCwaDataset(datasets.weekly, districts, apiKey),
    ]);
    responses.set(city, { shortTerm, weekly });
  }

  const snapshot = buildWeatherSnapshot(groups, responses);
  const existingWeather = (await database.ref('weather').get()).val();
  await database.ref().update(getPublishUpdates(existingWeather, snapshot));
  console.log(`已同步 ${Object.keys(snapshot.venues).length} 個球場，發布時間 ${snapshot.sourceIssuedAt}`);
}

function fixture(issueTime, rain = '40') {
  return {
    success: 'true',
    records: {
      DatasetInfo: { IssueTime: issueTime },
      Locations: [{
        Location: [{
          LocationName: '士林區',
          WeatherElement: [
            {
              ElementName: '天氣現象',
              Time: [
                { StartTime: '2026-07-20T12:00:00+08:00', EndTime: '2026-07-20T15:00:00+08:00', ElementValue: [{ Weather: '多雲' }] },
                { StartTime: '2026-07-20T15:00:00+08:00', EndTime: '2026-07-20T18:00:00+08:00', ElementValue: [{ Weather: '短暫雨' }] },
              ],
            },
            {
              ElementName: '降雨機率',
              Time: [
                { StartTime: '2026-07-20T12:00:00+08:00', EndTime: '2026-07-20T15:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '20' }] },
                { StartTime: '2026-07-20T15:00:00+08:00', EndTime: '2026-07-20T18:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: rain }] },
              ],
            },
          ],
        }],
      }],
    },
  };
}

function runSelfTest() {
  const now = new Date('2026-07-20T08:00:00+08:00');
  assert.deepEqual(
    selectUpcomingVenues({ a: { date: '2026-07-20', location: '天母' }, b: { date: '2026-07-26', location: '天母' }, c: { date: '2026-07-27', location: '洲際' } }, now),
    ['天母'],
  );
  const groups = groupVenuesByCity(['天母', '大巨蛋']);
  assert.deepEqual([...groups.get('臺北市').districts], ['士林區', '信義區']);

  const normalized = normalizeCwaResponse(fixture('2026-07-20T05:00:00+08:00'), 3);
  assert.equal(normalized.locations['士林區'][1].rainProbability, 40);
  assert.throws(() => normalizeCwaResponse(fixture('2026-07-20T05:00:00+08:00', '101'), 3), /降雨機率/);
  assert.equal(selectOverlappingPeriods(normalized.locations['士林區'], Date.parse('2026-07-20T14:00:00+08:00'), Date.parse('2026-07-20T17:00:00+08:00')).length, 2);

  const updates = getPublishUpdates(
    { sourceIssuedAt: normalized.sourceIssuedAt, venues: { keep: true } },
    { sourceIssuedAt: normalized.sourceIssuedAt, fetchedAt: 123, venues: { replace: true } },
  );
  assert.deepEqual(updates, { 'weather/fetchedAt': 123, 'lastSync/weather': 123 });
  console.log('sync-weather self-test passed');
}

const modulePath = fileURLToPath(import.meta.url);
const mainPath = process.argv[1] ? resolve(process.argv[1]) : '';
const isMain = process.platform === 'win32'
  ? modulePath.toLowerCase() === mainPath.toLowerCase()
  : modulePath === mainPath;

if (isMain) {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
  } else {
    syncWeather().catch((error) => {
      console.error(`天氣同步失敗：${error.message}`);
      process.exitCode = 1;
    });
  }
}
