import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeCheerleaderName,
  normalizeCheerleaderRecord,
} from '../scripts/cheerleaderName.js';

test('keeps only the first token when a scraped name contains whitespace', () => {
  assert.equal(normalizeCheerleaderName('Maggie 小美'), 'Maggie');
  assert.equal(normalizeCheerleaderName('冞冞 Mina'), '冞冞');
});

test('trims names and supports regular and unicode whitespace', () => {
  assert.equal(normalizeCheerleaderName('  Maggie  小美  '), 'Maggie');
  assert.equal(normalizeCheerleaderName('冞冞\u3000Mina'), '冞冞');
});

test('applies manual cheerleader display-name corrections', () => {
  assert.equal(normalizeCheerleaderName('邊荷律'), '荷律');
  assert.equal(normalizeCheerleaderName('瑄瑄'), '瑄');
  assert.equal(normalizeCheerleaderName('金渡兒'), '渡兒');
  assert.equal(normalizeCheerleaderName('Ella'), 'ELLA');
  assert.equal(normalizeCheerleaderName('姸蓁'), '妍蓁');
  assert.equal(normalizeCheerleaderName('妡蔆'), '妡0');
  assert.equal(normalizeCheerleaderName('Nina'), 'NINA');
  assert.equal(normalizeCheerleaderName('陳怡婷'), 'ET');
});

test('normalizes home and away member arrays while preserving other fields', () => {
  assert.deepEqual(
    normalizeCheerleaderRecord({
      homeMembers: ['Maggie 小美', '邊荷律'],
      awayMembers: ['冞冞 Mina', '金渡兒'],
      fetchedDate: '2026-06-24',
    }),
    {
      homeMembers: ['Maggie', '荷律'],
      awayMembers: ['冞冞', '渡兒'],
      fetchedDate: '2026-06-24',
    },
  );
});
