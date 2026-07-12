import assert from 'node:assert/strict';
import { getFriendsBoughtList } from '../src/utils/groupMarks.js';

const groupMarks = {
  law: {
    displayName: 'Law',
    marks: { game1: { ticketPurchased: true } },
  },
  friend: {
    displayName: '好友',
    marks: { game1: { ticketPurchased: true } },
  },
};

assert.deepEqual(getFriendsBoughtList(groupMarks, 'game1', 'law'), ['好友']);
assert.deepEqual(getFriendsBoughtList({ law: groupMarks.law }, 'game1', 'law'), []);

console.log('購票好友名單會排除目前登入者');
