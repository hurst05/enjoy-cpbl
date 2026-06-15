import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function run() {
  await set(ref(db, 'adminConfig/password'), '5566');
  console.log('Admin config populated successfully.');
  process.exit(0);
}

run();
