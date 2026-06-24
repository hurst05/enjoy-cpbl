import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeCheerleaderName,
  normalizeCheerleaderRecord,
} from '../scripts/cheerleaderName.js';

test('名字含空白時只保留第一段', () => {
  assert.equal(normalizeCheerleaderName('Maggie 小美'), 'Maggie');
  assert.equal(normalizeCheerleaderName('冞冞 Mina'), '冞冞');
});

test('清除名字前後空白並支援各種 Unicode 空白', () => {
  assert.equal(normalizeCheerleaderName('  Maggie  小美  '), 'Maggie');
  assert.equal(normalizeCheerleaderName('冞冞\u3000Mina'), '冞冞');
});

test('完整正規化既有班表的主客場名單', () => {
  assert.deepEqual(
    normalizeCheerleaderRecord({
      homeMembers: ['Maggie 小美', '短今'],
      awayMembers: ['冞冞 Mina'],
      fetchedDate: '2026-06-24',
    }),
    {
      homeMembers: ['Maggie', '短今'],
      awayMembers: ['冞冞'],
      fetchedDate: '2026-06-24',
    },
  );
});
