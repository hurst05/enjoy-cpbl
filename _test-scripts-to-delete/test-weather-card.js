import assert from 'node:assert/strict';
import { normalizeCwaResponse } from '../scripts/sync-weather.js';
import {
  formatWeatherTemperature,
  getGameWeather,
  getWeatherIconUrl,
} from '../src/utils/weather.js';

function shortTermFixture() {
  return {
    success: 'true',
    records: {
      DatasetInfo: { IssueTime: '2026-07-20T17:00:00+08:00' },
      Locations: [{
        Location: [{
          LocationName: '信義區',
          WeatherElement: [
            {
              ElementName: 'Wx',
              Time: [{
                StartTime: '2026-07-21T18:00:00+08:00',
                EndTime: '2026-07-21T21:00:00+08:00',
                ElementValue: [{ Weather: '短暫陣雨', WeatherCode: '08' }],
              }],
            },
            {
              ElementName: 'PoP6h',
              Time: [{
                StartTime: '2026-07-21T18:00:00+08:00',
                EndTime: '2026-07-22T00:00:00+08:00',
                ElementValue: [{ ProbabilityOfPrecipitation: '30' }],
              }],
            },
            {
              ElementName: 'T',
              Time: [
                {
                  DataTime: '2026-07-21T18:00:00+08:00',
                  ElementValue: [{ Temperature: '31' }],
                },
                {
                  DataTime: '2026-07-21T21:00:00+08:00',
                  ElementValue: [{ Temperature: '28' }],
                },
              ],
            },
          ],
        }],
      }],
    },
  };
}

const normalized = normalizeCwaResponse(shortTermFixture(), 3);
const shortTermPeriod = normalized.locations['信義區'][0];
assert.equal(shortTermPeriod.weatherCode, '08');
assert.equal(shortTermPeriod.minTemperature, 28);
assert.equal(shortTermPeriod.maxTemperature, 31);

const now = Date.parse('2026-07-20T20:00:00+08:00');
const shortTermModel = getGameWeather(
  { date: '2026-07-21', time: '18:35', location: '大巨蛋' },
  {
    status: 'ok',
    fetchedAt: now,
    sourceIssuedAt: '2026-07-20T09:00:00.000Z',
    venues: {
      大巨蛋: {
        shortTerm: [
          {
            startAt: '2026-07-21T15:00:00+08:00',
            endAt: '2026-07-21T18:00:00+08:00',
            weather: '陰',
            weatherCode: '07',
            rainProbability: 20,
          },
          shortTermPeriod,
          {
            startAt: '2026-07-21T21:00:00+08:00',
            endAt: '2026-07-22T00:00:00+08:00',
            weather: '多雲',
            weatherCode: '04',
            rainProbability: 20,
          },
        ],
        weekly: [],
      },
    },
  },
  now,
);

assert.equal(shortTermModel.gamePeriod.weather, '短暫陣雨');
assert.equal(shortTermModel.gamePeriod.rainProbability, 30);
assert.equal(
  getWeatherIconUrl(shortTermModel.gamePeriod),
  'https://www.cwa.gov.tw/V8/assets/img/weather_icons/weathers/svg_icon/night/08.svg',
);
assert.equal(formatWeatherTemperature(shortTermModel.gamePeriod), '28–31°C');

const weeklyModel = getGameWeather(
  { date: '2026-07-26', time: '16:05', location: '大巨蛋' },
  {
    status: 'ok',
    fetchedAt: now,
    sourceIssuedAt: '2026-07-20T09:00:00.000Z',
    venues: {
      大巨蛋: {
        shortTerm: [],
        weekly: [
          {
            startAt: '2026-07-26T06:00:00+08:00',
            endAt: '2026-07-26T18:00:00+08:00',
            weather: '晴時多雲',
            rainProbability: null,
            minTemperature: 27,
            maxTemperature: 35,
          },
          {
            startAt: '2026-07-26T18:00:00+08:00',
            endAt: '2026-07-27T06:00:00+08:00',
            weather: '晴時多雲',
            rainProbability: null,
            minTemperature: 27,
            maxTemperature: 31,
          },
        ],
      },
    },
  },
  now,
);

assert.equal(weeklyModel.gamePeriod.startAt, '2026-07-26T06:00:00+08:00');
assert.match(getWeatherIconUrl(weeklyModel.gamePeriod), /\/night\/02\.svg$/);
assert.equal(formatWeatherTemperature(weeklyModel.gamePeriod), '27–35°C');

console.log('weather card test passed');
