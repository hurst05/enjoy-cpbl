import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCwaBallparkUrl } from '../src/data/ballparks.js';

const gameModalSource = readFileSync(
  new URL('../src/components/GameModal.vue', import.meta.url),
  'utf8',
);

assert.match(
  gameModalSource,
  /getWeatherIconUrl/,
  '彈窗應沿用賽事卡片的中央氣象署天氣圖示',
);
assert.match(gameModalSource, /:href="cwaBallparkUrl"/);
assert.match(gameModalSource, /target="_blank"/);
assert.match(gameModalSource, /rel="noopener noreferrer"/);
assert.match(gameModalSource, /:src="weatherIconUrl"/);
assert.match(gameModalSource, /class="weather-title-link"/);

const sunnyIconIndex = gameModalSource.indexOf('class="weather-title-symbol">☀️');
const titleIndex = gameModalSource.indexOf('<span>球場天氣</span>');
const forecastLinkIndex = gameModalSource.indexOf('class="weather-title-link"');
assert.ok(sunnyIconIndex >= 0, '標題前方應保留固定晴天圖示');
assert.ok(
  sunnyIconIndex < titleIndex && titleIndex < forecastLinkIndex,
  '標題應依序顯示晴天圖示、球場天氣文字、可點擊的預報圖示',
);

const expectedPids = {
  天母: 'K001',
  新莊: 'K002',
  樂天桃園: 'K003',
  洲際: 'K005',
  斗六: 'K007',
  嘉義市: 'K008',
  澄清湖: 'K010',
  台東: 'K014',
  花蓮: 'K015',
  大巨蛋: 'K017',
  亞太主: 'K019',
};

for (const [ballpark, pid] of Object.entries(expectedPids)) {
  assert.equal(
    getCwaBallparkUrl(ballpark),
    `https://www.cwa.gov.tw/V8/C/L/Ballpark/Ballpark.html?PID=${pid}`,
  );
}

console.log('球場天氣標題與中央氣象署球場 PID 連結正確');
