import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const TICKET_RULES = {
  T4: [
    { label: '亞瑟王優先', offset: -7 },
    { label: '全面開賣', offset: -3 },
  ],
  T6: [
    { label: '鷹國人優先', offset: -7 },
    { label: '全面開賣', offset: -3 },
  ],
  T5: [
    { label: '獅卡Plus優先', offset: -10 },
    { label: '兆豐卡優先', offset: -7 },
    { label: '全面開賣', offset: -3 },
  ],
  default: [
    { label: '全面開賣', offset: -3 },
  ],
};

async function run() {
  await set(ref(db, 'ticketRules'), TICKET_RULES);
  console.log('Ticket rules populated successfully.');
  process.exit(0);
}

run();
