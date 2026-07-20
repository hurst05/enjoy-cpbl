const HOUR = 60 * 60 * 1000;
const TAIPEI_TIME_ZONE = 'Asia/Taipei';

function taipeiDateKey(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TAIPEI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function overlaps(period, start, end) {
  const periodStart = Date.parse(period.startAt);
  const periodEnd = Date.parse(period.endAt);
  return Number.isFinite(periodStart) && Number.isFinite(periodEnd)
    && periodStart < end && periodEnd > start;
}

function periodsForDate(periods, date) {
  return periods.filter((period) => {
    const start = new Date(period.startAt);
    return !Number.isNaN(start.getTime()) && taipeiDateKey(start) === date;
  });
}

export function getWeatherFreshness(fetchedAt, now = Date.now()) {
  const age = now - Number(fetchedAt);
  if (!Number.isFinite(age) || age < 0) return 'unknown';
  if (age > 12 * HOUR) return 'expired';
  if (age > 6 * HOUR) return 'stale';
  return 'fresh';
}

export function selectOverlappingPeriods(periods, start, end) {
  return periods.filter((period) => overlaps(period, start, end));
}

export function getGameWeather(game, weatherData, now = Date.now()) {
  const venue = weatherData?.status === 'ok' && weatherData.venues?.[game?.location];
  if (!venue || !game?.date) return null;

  const hasTime = /^\d{2}:\d{2}$/.test(game.time || '') && game.time !== 'TBD';
  const gameStart = hasTime ? Date.parse(`${game.date}T${game.time}:00+08:00`) : NaN;
  const hoursUntilGame = (gameStart - now) / HOUR;
  let periods = [];
  let mode = 'weekly';

  if (hasTime && hoursUntilGame >= 0 && hoursUntilGame <= 72) {
    periods = selectOverlappingPeriods(
      venue.shortTerm || [],
      gameStart - 4 * HOUR,
      gameStart + 3 * HOUR,
    );
    mode = 'shortTerm';
  } else {
    periods = periodsForDate(venue.weekly || [], game.date);
    if (!hasTime) {
      mode = 'tbd';
      if (periods.length === 0) periods = periodsForDate(venue.shortTerm || [], game.date);
    }
  }

  if (periods.length === 0) return null;

  const rainValues = periods
    .map((period) => period.rainProbability)
    .filter((value) => Number.isFinite(value));

  return {
    mode,
    periods,
    maxRainProbability: rainValues.length ? Math.max(...rainValues) : null,
    freshness: getWeatherFreshness(weatherData.fetchedAt, now),
    fetchedAt: weatherData.fetchedAt,
    sourceIssuedAt: weatherData.sourceIssuedAt,
  };
}

export function formatWeatherDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: TAIPEI_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatWeatherPeriod(period) {
  const start = new Date(period.startAt);
  const end = new Date(period.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '時間未知';
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: TAIPEI_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatter.format(start)}–${formatter.format(end)}`;
}
