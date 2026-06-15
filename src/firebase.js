import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, get, set, update, child, push,
} from 'firebase/database';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
  GoogleAuthProvider, signInWithPopup, linkWithPopup, unlink, updatePassword
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ===== Schedule CRUD =====

export async function getSchedules() {
  const snapshot = await get(ref(db, 'schedules'));
  return snapshot.val();
}

export async function saveSchedules(data) {
  await set(ref(db, 'schedules'), data);
}

export async function getThemeDays() {
  const snapshot = await get(ref(db, 'themeDays'));
  return snapshot.val() || {};
}

export async function updateThemeDay(gameId, themeDay) {
  if (themeDay) {
    await set(ref(db, `themeDays/${gameId}`), themeDay);
  } else {
    await set(ref(db, `themeDays/${gameId}`), null);
  }
}

export async function batchUpdateThemeDays(startDate, endDate, teamId, themeName) {
  const snapshot = await get(ref(db, 'schedules'));
  const schedules = snapshot.val();
  if (!schedules) return 0;

  let count = 0;
  const updates = {};
  
  for (const [gameId, game] of Object.entries(schedules)) {
    if (game.date >= startDate && game.date <= endDate && game.homeTeam === teamId) {
      updates[`themeDays/${gameId}`] = themeName || null;
      count++;
    }
  }

  if (count > 0) {
    await update(ref(db), updates);
  }
  return count;
}

export async function batchImportThemeDays(importData) {
  if (!importData || Object.keys(importData).length === 0) return 0;
  
  const updates = {};
  for (const [gameId, themeName] of Object.entries(importData)) {
    updates[`themeDays/${gameId}`] = themeName || null;
  }
  
  await update(ref(db), updates);
  return Object.keys(importData).length;
}

// ===== Ticket Schedules =====

export async function getTicketSchedules() {
  const snapshot = await get(ref(db, 'ticketSchedules'));
  return snapshot.val() || {};
}

export async function saveTicketScheduleGeneral(year, half, teamId, type, rules) {
  await set(ref(db, `ticketSchedules/${year}/${half}/${teamId}/${type}`), rules);
}

export async function saveTicketScheduleSpecific(gameId, rules) {
  await set(ref(db, `ticketSchedules/gameSpecific/${gameId}`), rules);
}


export async function getAllCheerleaders() {
  const snapshot = await get(ref(db, 'cheerleaders'));
  return snapshot.val();
}

export async function saveCheerleaders(gameId, data) {
  await set(ref(db, `cheerleaders/${gameId}`), data);
}

// ===== Sync Timestamp =====

export async function getLastSync() {
  const snapshot = await get(ref(db, 'lastSync'));
  return snapshot.val();
}

export async function setLastSync(type) {
  await update(ref(db, 'lastSync'), { [type]: Date.now() });
}

// ===== User Marks =====

export async function getUserMarks(uid) {
  const snapshot = await get(ref(db, `users/${uid}/marks`));
  return snapshot.val();
}

export async function setUserMark(uid, gameId, markType, value) {
  await set(ref(db, `users/${uid}/marks/${gameId}/${markType}`), value);
}

// ===== User Profile =====

export async function getAllUsers() {
  const snapshot = await get(ref(db, 'users'));
  return snapshot.val() || {};
}

export async function getUserProfile(uid) {
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.val();
}

export async function setUserProfile(uid, data) {
  await update(ref(db, `users/${uid}`), data);
}

export async function deleteUserData(uid) {
  const profile = await getUserProfile(uid);
  if (profile && profile.groups) {
    for (const groupId of Object.keys(profile.groups)) {
      await leaveGroup(uid, groupId);
    }
  }
  await set(ref(db, `users/${uid}`), null);
}

// ===== Groups =====

export async function createGroup(uid, displayName, groupName) {
  const groupId = groupName;
  const groupRef = ref(db, `groups/${groupId}`);
  const snapshot = await get(groupRef);
  if (snapshot.exists()) {
    throw new Error('此群組名稱已存在，請使用其他名稱');
  }

  await set(groupRef, {
    groupId,
    name: groupName,
    members: { [uid]: displayName },
  });
  return groupId;
}

export async function joinGroup(uid, displayName, groupId) {
  const groupRef = ref(db, `groups/${groupId}`);
  const snapshot = await get(groupRef);
  if (!snapshot.exists()) {
    throw new Error('群組不存在');
  }
  await set(ref(db, `groups/${groupId}/members/${uid}`), displayName);
}

export async function leaveGroup(uid, groupId) {
  await set(ref(db, `groups/${groupId}/members/${uid}`), null);
  const remainingMembers = await getGroupMembers(groupId);
  if (!remainingMembers || Object.keys(remainingMembers).length === 0) {
    await set(ref(db, `groups/${groupId}`), null);
  }
}

export async function getGroupMembers(groupId) {
  const snapshot = await get(ref(db, `groups/${groupId}/members`));
  return snapshot.val();
}

export async function getGroupMarks(groups) {
  if (!groups || typeof groups !== 'object') return {};

  const result = {};
  for (const groupId of Object.keys(groups)) {
    const members = await getGroupMembers(groupId);
    if (!members) continue;

    for (const uid of Object.keys(members)) {
      if (!result[uid]) {
        const profile = await getUserProfile(uid);
        if (profile) {
          result[uid] = {
            displayName: profile.displayName || members[uid],
            marks: profile.marks || {},
          };
        }
      }
    }
  }
  return result;
}

// ===== Auth =====

export async function loginAsUser(username) {
  const email = `${username}@enjoy-cpbl.local`;
  const pwd = `${username}_cpbl_pwd`;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pwd);
    return cred.user;
  } catch (err) {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      throw new Error('此帳號已設定為需要 Google 登入驗證，請使用 Google 登入');
    }
    // If sign in fails, attempt to create the user
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pwd);
      await updateProfile(cred.user, { displayName: username });
      await setUserProfile(cred.user.uid, { displayName: username, marks: {} });
      return cred.user;
    } catch (createErr) {
      if (createErr.code === 'auth/email-already-in-use') {
        throw new Error('此帳號已被註冊，請檢查密碼或使用 Google 登入');
      }
      throw new Error('登入失敗，請稍後再試');
    }
  }
}

export async function checkNicknameExists(username) {
  const users = await getAllUsers();
  for (const uid in users) {
    if (users[uid].displayName === username) {
      return true;
    }
  }
  return false;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function linkGoogleAccount() {
  if (!auth.currentUser) throw new Error('尚未登入');
  const provider = new GoogleAuthProvider();
  try {
    await linkWithPopup(auth.currentUser, provider);
    // Bind successful, scramble the password to disable plain login
    const randomPwd = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    await updatePassword(auth.currentUser, randomPwd);
  } catch (err) {
    if (err.code === 'auth/credential-already-in-use') {
      throw new Error('此 Google 帳號已經被其他帳號綁定過了');
    }
    throw new Error('綁定失敗：' + err.message);
  }
}

export async function unlinkGoogleAccount(username) {
  if (!auth.currentUser) throw new Error('尚未登入');
  try {
    await unlink(auth.currentUser, 'google.com');
    // Restore default password for plain login
    const pwd = `${username}_cpbl_pwd`;
    await updatePassword(auth.currentUser, pwd);
  } catch (err) {
    throw new Error('解除綁定失敗：' + err.message);
  }
}

export async function loginAsAdmin(password) {
  const email = 'admin@enjoy-cpbl.local';
  const paddedPassword = password + '00'; // Firebase requires at least 6 chars
  
  try {
    const cred = await signInWithEmailAndPassword(auth, email, paddedPassword);
    return cred.user;
  } catch (err) {
    // Auto-create admin account if it doesn't exist and password is the default 5566
    if (password === '5566') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, paddedPassword);
        await updateProfile(cred.user, { displayName: '管理員' });
        await setUserProfile(cred.user.uid, { displayName: '管理員', marks: {}, isAdmin: true });
        return cred.user;
      } catch (createErr) {
        throw new Error('管理員帳號初始化失敗');
      }
    }
    throw new Error('管理員登入失敗：密碼錯誤');
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}
