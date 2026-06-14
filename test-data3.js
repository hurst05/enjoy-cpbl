import { readFile } from 'fs/promises';

async function checkFirebase() {
  const configStr = await readFile('./firebase-applet-config.json', 'utf-8');
  const config = JSON.parse(configStr);
  const dbUrl = config.databaseURL + '/schedules.json';
  
  const res = await fetch(dbUrl);
  const data = await res.json();
  
  if (data) {
    const juneGames = Object.values(data).filter(g => g.date.startsWith('2026-06'));
    console.log('June games count:', juneGames.length);
  } else {
    console.log('data is null');
  }
}

checkFirebase();
