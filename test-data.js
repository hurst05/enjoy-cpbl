import { readFile } from 'fs/promises';

async function checkFirebase() {
  const configStr = await readFile('./firebase-applet-config.json', 'utf-8');
  const config = JSON.parse(configStr);
  const dbUrl = config.databaseURL + '/schedules.json';
  
  const res = await fetch(dbUrl);
  const data = await res.json();
  console.log('Schedules count:', data ? Object.keys(data).length : 0);
  if (!data) console.log('Data is null/empty!');
}

checkFirebase();
