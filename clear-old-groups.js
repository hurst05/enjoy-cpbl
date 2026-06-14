import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, update } from 'firebase/database';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function run() {
  console.log('Deleting all groups...');
  await set(ref(db, 'groups'), null);

  console.log('Removing groupId from all users...');
  const usersSnap = await get(ref(db, 'users'));
  const users = usersSnap.val();
  if (users) {
    const updates = {};
    for (const uid of Object.keys(users)) {
      updates[`users/${uid}/groupId`] = null;
      updates[`users/${uid}/groups`] = null;
    }
    await update(ref(db), updates);
  }
  console.log('Done clearing old group data.');
  process.exit(0);
}

run();
