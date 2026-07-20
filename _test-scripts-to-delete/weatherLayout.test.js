import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gameModalSource = readFileSync(
  new URL('../src/components/GameModal.vue', import.meta.url),
  'utf8',
);
const gameCardSource = readFileSync(
  new URL('../src/components/GameCard.vue', import.meta.url),
  'utf8',
);
const globalComponentsSource = readFileSync(
  new URL('../src/styles/_components.scss', import.meta.url),
  'utf8',
);

assert.match(
  gameModalSource,
  /class="weather-period-temperature"/,
  '溫度欄位應有可獨立控制對齊的 class',
);
assert.match(
  gameModalSource,
  /\.weather-period-text,\s*\.weather-period-temperature\s*{[^}]*justify-self:\s*end;[^}]*text-align:\s*right;/s,
  '天氣文字與溫度都應靠右對齊',
);

const weatherBadgeCss = gameCardSource.match(/\.icon-weather\s*{(?<css>[^}]*)}/s)?.groups?.css || '';
assert.match(weatherBadgeCss, /box-sizing:\s*border-box;/);
assert.match(weatherBadgeCss, /width:\s*24px;/);
assert.match(weatherBadgeCss, /height:\s*24px;/);
assert.match(weatherBadgeCss, /left:\s*2px;/);
assert.match(weatherBadgeCss, /padding:\s*3px;/);
assert.match(weatherBadgeCss, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\);/);
assert.match(weatherBadgeCss, /border:\s*1px solid rgba\(27,\s*42,\s*63,\s*0\.3\);/);

const weatherImageCss = gameCardSource.match(/\.weather-icon-image\s*{(?<css>[^}]*)}/s)?.groups?.css || '';
assert.match(weatherImageCss, /width:\s*16px;/);
assert.match(weatherImageCss, /height:\s*16px;/);
assert.match(weatherImageCss, /drop-shadow\(/);

assert.match(
  gameCardSource,
  /'game-card-has-weather':\s*weatherIconUrl/,
  '有天氣徽章的卡片應有專屬版面 class',
);
assert.match(
  gameCardSource,
  /\.game-card\s*{[^}]*container:\s*weather-card\s*\/\s*inline-size;/s,
  '賽事卡片應依自身寬度調整內容，而不是跟著螢幕寬度改變',
);
assert.match(
  gameCardSource,
  /\.game-card-has-weather:not\(\.game-card-list\)\s+\.game-matchup\s*{[^}]*box-sizing:\s*border-box;[^}]*width:\s*100%;[^}]*justify-content:\s*center;[^}]*gap:\s*0;[^}]*overflow:\s*visible;/s,
  '寬版天氣卡片的對戰資訊應維持置中',
);
assert.match(
  gameCardSource,
  /@container\s+weather-card\s*\(max-width:\s*115px\)\s*{[\s\S]*?\.game-card-has-weather:not\(\.game-card-list\)\s+\.game-matchup\s*{[^}]*padding-left:\s*18px;[^}]*justify-content:\s*flex-start;/s,
  '只有窄版天氣卡片才應保留左側徽章空間',
);
assert.doesNotMatch(
  gameCardSource,
  /\.game-card-has-weather:not\(\.game-card-list\)\s+\.team-logo\s*{/s,
  '有無天氣圖示都應共用相同的隊徽尺寸',
);
assert.match(
  globalComponentsSource,
  /\.team-logo\s*{[^}]*height:\s*24px;[^}]*max-width:\s*30px;/s,
  '所有賽事卡片的隊徽都應使用共用的大尺寸',
);
assert.match(
  gameCardSource,
  /\.game-card-has-weather:not\(\.game-card-list\)\s+\.game-center-info\s*{[^}]*margin:\s*0;/s,
  '窄版天氣卡片不應浪費中央資訊的水平空間',
);

console.log('天氣欄位靠右，卡片天氣徽章固定且不遮擋內容');
