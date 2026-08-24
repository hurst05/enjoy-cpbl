import * as fb from '../src/firebase.js';

async function main() {
  const cheerleaders = await fb.getAllCheerleaders();
  const names = new Set();
  if (cheerleaders) {
    for (const game of Object.values(cheerleaders)) {
      if (game.homeMembers) game.homeMembers.forEach(n => names.add(n));
      if (game.awayMembers) game.awayMembers.forEach(n => names.add(n));
    }
  }
  console.log('Unique names in Firebase:', Array.from(names).sort().join(', '));
  process.exit(0);
}

main();
