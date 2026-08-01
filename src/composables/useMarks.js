import { ref } from 'vue';
import {
  getUserMarks,
  getGroupMarks,
  setGroupTicketPurchased,
  setUserGameNote,
  setUserMark,
} from '../firebase.js';

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

      // 自動載入群友的標記資料，讓主畫面卡片可以直接顯示
      if (profile && profile.groups && Object.keys(profile.groups).length > 0) {
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

  async function handleMark(user, { gameId, markType, value, targetUid, groupId }) {
    if (!user) return;
    try {
      if (targetUid && targetUid !== user.uid) {
        const target = groupMarks.value[targetUid];
        if (!target || (value && !target.groupIds?.includes(groupId))) {
          throw new Error('找不到共同群組');
        }

        await setGroupTicketPurchased(
          targetUid,
          gameId,
          user.uid,
          value ? groupId : null,
        );

        if (value) {
          target.marks[gameId] ||= {};
          target.marks[gameId].ticketPurchasedBy ||= {};
          target.marks[gameId].ticketPurchasedBy[user.uid] = groupId;
        } else if (target.marks[gameId]?.ticketPurchasedBy) {
          delete target.marks[gameId].ticketPurchasedBy[user.uid];
          if (Object.keys(target.marks[gameId].ticketPurchasedBy).length === 0) {
            delete target.marks[gameId].ticketPurchasedBy;
          }
        }
        return;
      }

      await setUserMark(user.uid, gameId, markType, value);
      if (!userMarks.value[gameId]) {
        userMarks.value[gameId] = {};
      }
      userMarks.value[gameId][markType] = value;
    } catch (e) {
      console.error('標記失敗:', e);
      throw e;
    }
  }

  async function handleSaveGameNote(user, { gameId, note }) {
    if (!user) throw new Error('請先登入');

    try {
      const normalizedNote = await setUserGameNote(user.uid, gameId, note);
      userMarks.value[gameId] ||= {};

      if (normalizedNote) {
        userMarks.value[gameId].note = normalizedNote;
      } else {
        delete userMarks.value[gameId].note;
      }

      return normalizedNote;
    } catch (e) {
      console.error('儲存備註失敗:', e);
      throw e;
    }
  }

  return {
    userMarks,
    groupMarks,
    loadUserMarksData,
    loadGroupData,
    handleMark,
    handleSaveGameNote,
  };
}
