import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
  try {
    console.log('Trying sign in...');
    await signInWithEmailAndPassword(auth, 'admin@enjoy-cpbl.local', '556600');
    console.log('Sign in success!');
  } catch (err) {
    console.log('Sign in failed:', err.code, err.message);
    try {
      console.log('Trying create user...');
      await createUserWithEmailAndPassword(auth, 'admin@enjoy-cpbl.local', '556600');
      console.log('Create user success!');
    } catch (e) {
      console.log('Create user failed:', e.code, e.message);
    }
  }
  process.exit(0);
}

run();
