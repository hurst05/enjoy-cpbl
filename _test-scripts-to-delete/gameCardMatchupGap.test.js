import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gameCardSource = readFileSync(
  new URL('../src/components/GameCard.vue', import.meta.url),
  'utf8',
);

const weatherMatchupRule = gameCardSource.match(
  /\.game-card-has-weather:not\(\.game-card-list\) \.game-matchup\s*\{([^}]*)\}/,
);

assert.ok(weatherMatchupRule, 'Weather cards should define their matchup layout');
assert.match(
  weatherMatchupRule[1],
  /\bgap:\s*6px\s*;/,
  'Weather cards should keep a consistent 6px gap between matchup elements',
);

console.log('Game card matchup gap is consistent when weather is shown.');
