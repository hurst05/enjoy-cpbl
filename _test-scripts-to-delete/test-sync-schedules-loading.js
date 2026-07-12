import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('scripts/sync-schedules.js', 'utf8');

assert.doesNotMatch(source, /\.game_detail/);
assert.match(source, /waitForResponse/);
assert.match(source, /getgamedatas/);
assert.match(source, /request\(\)\.method\(\) === 'POST'/);
assert.match(source, /JSON\.parse\(payload\.GameDatas/);
assert.match(source, /Array\.isArray\(rawGames\)/);
assert.match(source, /finally\s*{[\s\S]*await browser\.close\(\)/);
assert.match(source, /if \(games && games\.length > 0\)/);

console.log('賽程載入方式檢查通過');
