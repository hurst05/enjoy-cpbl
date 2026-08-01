import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getFriendGameNotes,
  hasAnyGameNote,
  hasFriendGameNote,
  normalizeGameNote,
  splitNoteContent,
} from '../src/utils/gameNotes.js';

assert.equal(normalizeGameNote('  相簿連結  '), '相簿連結');
assert.equal(normalizeGameNote('   '), '');
assert.equal(normalizeGameNote(null), '');

assert.deepEqual(
  splitNoteContent('照片：https://example.com/a 看這裡'),
  [
    { type: 'text', value: '照片：' },
    { type: 'link', value: 'https://example.com/a' },
    { type: 'text', value: ' 看這裡' },
  ],
);
assert.deepEqual(
  splitNoteContent('javascript:alert(1)'),
  [{ type: 'text', value: 'javascript:alert(1)' }],
);
assert.deepEqual(
  splitNoteContent('https://one.example/x\nhttp://two.example/y'),
  [
    { type: 'link', value: 'https://one.example/x' },
    { type: 'text', value: '\n' },
    { type: 'link', value: 'http://two.example/y' },
  ],
);

const groupMarks = {
  self: {
    displayName: '自己',
    marks: { game1: { note: '不應重複顯示' } },
    groupIds: ['group-a'],
  },
  friendA: {
    displayName: '小明',
    marks: { game1: { note: '  https://example.com/photo  ' } },
    groupIds: ['group-a', 'group-b'],
  },
  friendB: {
    displayName: '小美',
    marks: { game1: { note: '   ' } },
    groupIds: ['group-a'],
  },
  friendC: {
    displayName: '',
    marks: { game1: { note: '集合地點' } },
    groupIds: ['group-a'],
  },
};

assert.deepEqual(getFriendGameNotes(groupMarks, 'game1', 'self'), [
  { uid: 'friendA', displayName: '小明', note: 'https://example.com/photo' },
  { uid: 'friendC', displayName: 'friendC', note: '集合地點' },
]);
assert.deepEqual(getFriendGameNotes(groupMarks, 'game2', 'self'), []);
assert.equal(hasFriendGameNote(groupMarks, 'game1', 'self'), true);
assert.equal(hasFriendGameNote(groupMarks, 'game1', 'friendA'), true);
assert.equal(hasFriendGameNote({ self: groupMarks.self }, 'game1', 'self'), false);
assert.equal(hasFriendGameNote(groupMarks, 'game2', 'self'), false);
assert.equal(hasAnyGameNote({ game1: { note: '自己的備註' } }, {}, 'game1', 'self'), true);
assert.equal(hasAnyGameNote({}, groupMarks, 'game1', 'self'), true);
assert.equal(hasAnyGameNote({}, { self: groupMarks.self }, 'game1', 'self'), false);
assert.equal(hasAnyGameNote({}, groupMarks, 'game2', 'self'), false);

const gameModalSource = readFileSync(new URL('../src/components/GameModal.vue', import.meta.url), 'utf8');
const cheerSectionPosition = gameModalSource.indexOf('<!-- Cheerleader Section -->');
const savedNotePosition = gameModalSource.indexOf('class="own-game-note-preview"');
const ticketSectionPosition = gameModalSource.indexOf('<!-- Ticket Schedule Section -->');
const marksSectionPosition = gameModalSource.indexOf('<!-- Marks & Calendar Section -->');
const noteInputPosition = gameModalSource.indexOf('class="game-note-textarea"');

assert(savedNotePosition > cheerSectionPosition && savedNotePosition < ticketSectionPosition,
  '已儲存備註應顯示於啦啦隊名單下方、售票時程之前');
assert(noteInputPosition > marksSectionPosition,
  '賽事備註輸入區應保留在原本下方的位置');

const gameCardSource = readFileSync(new URL('../src/components/GameCard.vue', import.meta.url), 'utf8');
const componentStylesSource = readFileSync(new URL('../src/styles/_components.scss', import.meta.url), 'utf8');

assert(!gameCardSource.includes("'game-card-has-notes': hasGameNotes"),
  '有賽事備註時，不應高亮整張卡片');
assert(gameCardSource.includes("'icon-cheer-has-notes': hasGameNotes"),
  '有賽事備註時，啦啦隊圖示應套用提示類別');
assert(!gameCardSource.includes('cheer-note-badge'),
  '備註提示不應再使用啦啦隊圖示上的驚嘆號徽章');
assert(!componentStylesSource.includes('.game-card-has-notes'),
  '備註提示不應使用整張卡片的高亮樣式');
assert(!gameCardSource.includes('cheer-note-highlight'),
  '備註提示不應增加圖示外側的圓形容器');
assert(gameCardSource.includes(':deep(.svg-icon)'),
  '備註提示應直接套用在啦啦隊 SVG 圖示上');
assert(gameCardSource.includes('@keyframes cheer-note-colors'),
  '啦啦隊 SVG 圖示應播放彩色提示動畫');

console.log('gameNotes tests passed');
