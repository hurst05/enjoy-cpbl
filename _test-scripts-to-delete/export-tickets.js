import * as fb from '../src/firebase.js';

async function exportTickets() {
  try {
    const data = await fb.getTicketSchedules();
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

exportTickets();
