import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRestSeatDisplay,
  getRestSeatEligibleMembers,
  getRestSeatGameBasis,
  isRestSeatGame,
} from '../src/utils/restSeat.js';

test('uses original game date and location to decide rest-seat games', () => {
  assert.equal(
    isRestSeatGame({
      homeTeam: 'T5',
      date: '2026-07-09',
      dayOfWeek: '週四',
      location: '台南',
      originalDate: '2026-07-08',
      originalDayOfWeek: '週三',
      originalLocation: '亞太主',
    }),
    true,
  );

  assert.equal(
    isRestSeatGame({
      homeTeam: 'T5',
      date: '2026-07-08',
      dayOfWeek: '週三',
      location: '亞太主',
      originalDate: '2026-07-07',
      originalDayOfWeek: '週二',
      originalLocation: '台南',
    }),
    false,
  );
});

test('falls back to current fields when original metadata does not exist', () => {
  assert.deepEqual(
    getRestSeatGameBasis({
      homeTeam: 'T5',
      date: '2026-07-08',
      dayOfWeek: '週三',
      location: '亞太主',
    }),
    {
      homeTeam: 'T5',
      date: '2026-07-08',
      dayOfWeek: '週三',
      location: '亞太主',
    },
  );
});

test('does not mix current venue with original date for postponed games', () => {
  assert.equal(
    isRestSeatGame({
      homeTeam: 'T5',
      date: '2026-07-01',
      dayOfWeek: '週三',
      location: '亞太主',
      isPostponed: true,
      originalDate: '2026-06-14',
    }),
    false,
  );
});

test('prefers members who have not appeared in previous rest-seat assignments', () => {
  const restSeats = {
    game_2026_101: { members: ['妮妮', '瑄'] },
    game_2026_102: { members: ['一粒'] },
  };

  assert.deepEqual(
    getRestSeatEligibleMembers(['妮妮', '瑄', '一粒', '艾璐', '草莓'], restSeats),
    ['艾璐', '草莓'],
  );
});

test('allows all scheduled members when unassigned members are fewer than two', () => {
  const restSeats = {
    game_2026_101: { members: ['妮妮', '瑄'] },
    game_2026_102: { members: ['一粒'] },
  };

  assert.deepEqual(
    getRestSeatEligibleMembers(['妮妮', '瑄', '一粒', '艾璐'], restSeats, 2),
    ['妮妮', '瑄', '一粒', '艾璐'],
  );
});

test('uses saved rest-seat members before showing candidate members', () => {
  const restSeats = {
    game_2026_101: { members: ['妮妮', '瑄'] },
    game_2026_103: { members: ['艾璐', '草莓'] },
  };

  assert.deepEqual(
    getRestSeatDisplay('game_2026_103', ['妮妮', '瑄', '艾璐', '草莓'], restSeats),
    {
      status: 'saved',
      label: '歇歇席',
      members: ['艾璐', '草莓'],
    },
  );

  assert.deepEqual(
    getRestSeatDisplay('game_2026_104', ['妮妮', '瑄', '艾璐', '草莓'], restSeats),
    {
      status: 'candidates',
      label: '可能歇歇席',
      members: ['妮妮', '瑄', '艾璐', '草莓'],
    },
  );
});
