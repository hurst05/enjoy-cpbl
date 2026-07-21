import assert from 'node:assert/strict';
import {
  getFriendsBoughtList,
  hasTicketPurchased,
} from '../src/utils/groupMarks.js';

const groupMarks = {
  law: {
    displayName: 'Law',
    marks: { game1: { ticketPurchased: true } },
  },
  friend: {
    displayName: '好友',
    marks: { game1: { ticketPurchasedBy: { law: 'group1' } } },
  },
  another: {
    displayName: '另一位好友',
    marks: { game1: { ticketPurchasedBy: { law: 'group1', buyer2: 'group1' } } },
  },
};

assert.equal(hasTicketPurchased({ ticketPurchased: true }), true);
assert.equal(hasTicketPurchased({ ticketPurchasedBy: { law: 'group1' } }), true);
assert.equal(hasTicketPurchased({ ticketPurchasedBy: {} }), false);
assert.deepEqual(getFriendsBoughtList(groupMarks, 'game1', 'law'), ['好友', '另一位好友']);
assert.deepEqual(getFriendsBoughtList({ law: groupMarks.law }, 'game1', 'law'), []);

delete groupMarks.another.marks.game1.ticketPurchasedBy.law;
assert.equal(hasTicketPurchased(groupMarks.another.marks.game1), true);
delete groupMarks.another.marks.game1.ticketPurchasedBy.buyer2;
assert.equal(hasTicketPurchased(groupMarks.another.marks.game1), false);

assert.equal(new Set(getFriendsBoughtList(groupMarks, 'game1', 'law')).size, 1);
console.log('本人與群友代購狀態彙整正確，且好友名單排除目前登入者');
