import { readFile } from 'fs/promises';

async function checkFirebase() {
  const configStr = await readFile('./firebase-applet-config.json', 'utf-8');
  const config = JSON.parse(configStr);
  const dbUrl = config.databaseURL + '/schedules.json';
  
  const res = await fetch(dbUrl);
  const data = await res.json();
  const firstGame = Object.values(data)[0];
  console.log('First game:', firstGame);
}

checkFirebase();
