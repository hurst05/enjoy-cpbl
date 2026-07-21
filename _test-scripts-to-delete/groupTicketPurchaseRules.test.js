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

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectDatabaseEmulator(db, '127.0.0.1', 9000);

async function createUser(name) {
  const email = `${name}@example.com`;
  const credential = await createUserWithEmailAndPassword(auth, email, 'password');
  await set(ref(db, `users/${credential.user.uid}`), { displayName: name });
  await signOut(auth);
  return { email, uid: credential.user.uid };
}

async function login(user) {
  await signInWithEmailAndPassword(auth, user.email, 'password');
}

const buyer = await createUser('buyer');
const target = await createUser('target');
const outsider = await createUser('outsider');
const otherBuyer = await createUser('other-buyer');
const ticketPath = `users/${target.uid}/marks/game1/ticketPurchasedBy/${buyer.uid}`;

await login(buyer);
await set(ref(db, 'groups/group1'), {
  members: { [buyer.uid]: 'buyer', [target.uid]: 'target' },
});

await set(ref(db, ticketPath), 'group1');
await assert.rejects(
  set(ref(db, `users/${outsider.uid}/marks/game1/ticketPurchasedBy/${buyer.uid}`), 'group1'),
  /PERMISSION_DENIED/,
);
await assert.rejects(
  set(ref(db, `users/${target.uid}/marks/game1/ticketPurchasedBy/${otherBuyer.uid}`), 'group1'),
  /PERMISSION_DENIED/,
);

await remove(ref(db, `groups/group1/members/${buyer.uid}`));
await remove(ref(db, ticketPath));

await set(ref(db, `groups/group1/members/${buyer.uid}`), 'buyer');
await set(ref(db, ticketPath), 'group1');
await signOut(auth);
await login(target);
await remove(ref(db, ticketPath));

await deleteApp(app);
console.log('群組代購資料庫規則驗證通過');
