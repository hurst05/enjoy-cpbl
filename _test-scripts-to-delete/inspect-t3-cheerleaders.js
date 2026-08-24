import * as fb from '../src/firebase.js';

async function main() {
  const cheerleaders = await fb.getAllCheerleaders();
  const schedules = await fb.getSchedules();
  
  if (!schedules || !cheerleaders) {
    console.log('No schedules or cheerleaders');
    return;
  }

  const t3Names = new Set();
  const sampleRecords = [];

  for (const [gameId, game] of Object.entries(schedules)) {
    if (game.homeTeam === 'T3' && cheerleaders[gameId]) {
      const rec = cheerleaders[gameId];
      if (rec.homeMembers) {
        rec.homeMembers.forEach(n => t3Names.add(n));
        sampleRecords.push({ date: game.date, homeMembers: rec.homeMembers });
      }
    }
  }

  console.log('All T3 cheerleader names in Firebase:');
  console.log(Array.from(t3Names).sort());
  console.log('\nSample recent T3 records:');
  console.log(JSON.stringify(sampleRecords.slice(-5), null, 2));

  process.exit(0);
}

main();
