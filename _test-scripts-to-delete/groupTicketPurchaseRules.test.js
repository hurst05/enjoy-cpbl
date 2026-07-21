import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  connectDatabaseEmulator,
  getDatabase,
  ref,
  remove,
  set,
} from 'firebase/database';

const projectId = 'demo-enjoy-cpbl';
const app = initializeApp({
  apiKey: 'demo',
  projectId,
  databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`,
});
const auth = getAuth(app);
const db = getDatabase(app);
const testRunId = `${Date.now()}-${process.pid}`;

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectDatabaseEmulator(db, '127.0.0.1', 9000);

async function withTimeout(promise, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} 逾時`)), 5000);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function createUser(name) {
  console.log(`建立測試使用者：${name}`);
  const email = `${name}-${testRunId}@example.com`;
  const credential = await withTimeout(
    createUserWithEmailAndPassword(auth, email, 'password'),
    `建立測試使用者 ${name}`,
  );
  console.log(`寫入測試使用者資料：${name}`);
  await withTimeout(
    set(ref(db, `users/${credential.user.uid}`), { displayName: name }),
    `寫入測試使用者資料 ${name}`,
  );
  await withTimeout(signOut(auth), `登出測試使用者 ${name}`);
  console.log(`測試使用者建立完成：${name}`);
  return { email, uid: credential.user.uid };
}

async function login(user) {
  await withTimeout(
    signInWithEmailAndPassword(auth, user.email, 'password'),
    `登入測試使用者 ${user.email}`,
  );
}

const buyer = await createUser('buyer');
const target = await createUser('target');
const outsider = await createUser('outsider');
const otherBuyer = await createUser('other-buyer');
const groupId = `group-${testRunId}`;
const gameId = `game-${testRunId}`;
const ticketPath = `users/${target.uid}/marks/${gameId}/ticketPurchasedBy/${buyer.uid}`;

await login(buyer);
await withTimeout(
  set(ref(db, `groups/${groupId}`), {
    members: { [buyer.uid]: 'buyer', [target.uid]: 'target' },
  }),
  '建立測試群組',
);

await withTimeout(set(ref(db, ticketPath), groupId), '同群組成員新增代購紀錄');
await assert.rejects(
  withTimeout(
    set(ref(db, `users/${outsider.uid}/marks/${gameId}/ticketPurchasedBy/${buyer.uid}`), groupId),
    '替非同群組成員新增代購紀錄',
  ),
  /PERMISSION_DENIED/,
);
await assert.rejects(
  withTimeout(
    set(ref(db, `users/${target.uid}/marks/${gameId}/ticketPurchasedBy/${otherBuyer.uid}`), groupId),
    '修改其他購票者的代購紀錄',
  ),
  /PERMISSION_DENIED/,
);

await withTimeout(remove(ref(db, `groups/${groupId}/members/${buyer.uid}`)), '離開測試群組');
await withTimeout(remove(ref(db, ticketPath)), '離開群組後刪除自己的代購紀錄');

await withTimeout(set(ref(db, `groups/${groupId}/members/${buyer.uid}`), 'buyer'), '重新加入測試群組');
await withTimeout(set(ref(db, ticketPath), groupId), '重新建立代購紀錄');
await withTimeout(signOut(auth), '登出購票者');
await login(target);
await withTimeout(remove(ref(db, ticketPath)), '資料擁有者刪除代購紀錄');

await deleteApp(app);
console.log('群組代購資料庫規則驗證通過');
process.exit(0);
