import { ref } from 'vue';
import { getUserMarks, getGroupMarks, setUserMark } from '../firebase.js';

export function useMarks() {
  const userMarks = ref({});
  const groupMarks = ref({});

  async function loadUserMarksData(user, profile) {
    if (!user) {
      userMarks.value = {};
      groupMarks.value = {};
      return;
    }
    
    try {
      const marks = await getUserMarks(user.uid);
      userMarks.value = marks || {};

      if (profile?.groups) {
        await loadGroupData(profile.groups);
      } else {
        groupMarks.value = {};
      }
    } catch (e) {
      console.error('載入標記資料失敗:', e);
    }
  }

  async function loadGroupData(groups) {
    try {
      if (!groups || Object.keys(groups).length === 0) {
        groupMarks.value = {};
        return;
      }
      const data = await getGroupMarks(groups);
      groupMarks.value = data || {};
    } catch (e) {
      console.error('載入群組資料失敗:', e);
    }
  }

  async function handleMark(user, { gameId, markType, value }) {
    if (!user) return;
    try {
      await setUserMark(user.uid, gameId, markType, value);
      if (!userMarks.value[gameId]) {
        userMarks.value[gameId] = {};
      }
      userMarks.value[gameId][markType] = value;
    } catch (e) {
      console.error('標記失敗:', e);
    }
  }

  return {
    userMarks,
    groupMarks,
    loadUserMarksData,
    loadGroupData,
    handleMark
  };
}
