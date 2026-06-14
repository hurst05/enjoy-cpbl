<template>
  <div class="group-panel">
    <div class="group-panel-inner">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h3 style="margin: 0;">👥 我的群組</h3>
        <button class="btn-ghost" style="padding: 4px;" @click="$emit('close')">✕</button>
      </div>

      <div id="group-info">
        <template v-if="!currentUser">
          <p class="group-hint">登入後即可建立或加入群組</p>
        </template>
        <template v-else-if="isLoading">
          <p class="group-hint">載入中...</p>
        </template>
        <template v-else-if="!profile?.groups || Object.keys(profile.groups).length === 0">
          <p class="group-hint">你尚未加入任何群組，請建立或加入一個群組</p>
        </template>
        <template v-else>
          <div v-for="(_val, groupId) in profile.groups" :key="groupId" class="group-id-display" style="margin-bottom: 8px;">
            <span class="group-id-label">群組 ID:</span>
            <code class="group-id-value">{{ groupId }}</code>
            <button class="btn-copy-id" @click="copyId(groupId)">📋</button>
            <button class="btn-small" style="margin-left: 10px; background-color: #f44336; color: white; border: none; cursor: pointer;" @click="handleLeaveGroup(groupId)">退出</button>
          </div>
        </template>
      </div>

      <div class="group-actions">
        <input type="text" v-model="groupNameInput" placeholder="輸入群組名稱..." />
        <button class="btn-small" @click="handleCreateGroup">建立群組</button>
      </div>
      <div class="group-actions">
        <input type="text" v-model="groupIdInput" placeholder="輸入群組 ID 加入..." />
        <button class="btn-small" @click="handleJoinGroup">加入群組</button>
      </div>

      <div v-if="members.length" class="group-members-list">
        <div class="group-members-title">成員 ({{ members.length }})</div>
        <div v-for="member in members" :key="member" class="group-member-item">👤 {{ member }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { createGroup, joinGroup, leaveGroup, getUserProfile, setUserProfile, getGroupMembers } from '../firebase.js';

const props = defineProps({
  currentUser: Object
});

const emit = defineEmits(['close', 'group-changed']);

const groupNameInput = ref('');
const groupIdInput = ref('');
const profile = ref(null);
const members = ref([]);
const isLoading = ref(false);

const loadGroupInfo = async () => {
  if (!props.currentUser) {
    profile.value = null;
    members.value = [];
    return;
  }
  
  isLoading.value = true;
  try {
    const userProfile = await getUserProfile(props.currentUser.uid);
    profile.value = userProfile;
    
    if (userProfile?.groups) {
      const allMembers = new Set();
      for (const groupId of Object.keys(userProfile.groups)) {
        const groupMembers = await getGroupMembers(groupId);
        if (groupMembers) {
          Object.values(groupMembers).forEach(m => allMembers.add(m));
        }
      }
      members.value = Array.from(allMembers);
    } else {
      members.value = [];
    }
  } catch (e) {
    console.error('群組資料載入失敗:', e);
  } finally {
    isLoading.value = false;
  }
};

watch(() => props.currentUser, loadGroupInfo, { immediate: true });

const handleCreateGroup = async () => {
  const groupName = groupNameInput.value.trim();
  if (!groupName) return alert('請輸入群組名稱');
  if (/[.#$\[\]]/.test(groupName)) {
    return alert('群組名稱不能包含 . # $ [ ] 等特殊字元');
  }
  if (!props.currentUser) return alert('請先登入');

  try {
    const groupId = await createGroup(props.currentUser.uid, props.currentUser.displayName || props.currentUser.email, groupNameInput.value.trim());
    const newGroups = { ...(profile.value?.groups || {}), [groupId]: true };
    await setUserProfile(props.currentUser.uid, {
      ...profile.value,
      groups: newGroups,
    });
    groupNameInput.value = '';
    alert(`群組建立成功！\n群組 ID: ${groupId}\n分享此 ID 給朋友加入`);
    await loadGroupInfo();
    emit('group-changed', newGroups);
  } catch (e) {
    console.error('建立群組失敗:', e);
    alert('建立群組失敗: ' + e.message);
  }
};

const handleJoinGroup = async () => {
  if (!groupIdInput.value.trim()) return alert('請輸入群組 ID');
  if (!props.currentUser) return alert('請先登入');

  try {
    const groupId = groupIdInput.value.trim();
    if (profile.value?.groups && profile.value.groups[groupId]) {
      return alert('你已經加入此群組');
    }
    await joinGroup(props.currentUser.uid, props.currentUser.displayName || props.currentUser.email, groupId);
    const newGroups = { ...(profile.value?.groups || {}), [groupId]: true };
    await setUserProfile(props.currentUser.uid, {
      ...profile.value,
      groups: newGroups,
    });
    groupIdInput.value = '';
    alert('加入群組成功！');
    await loadGroupInfo();
    emit('group-changed', newGroups);
  } catch (e) {
    console.error('加入群組失敗:', e);
    alert('加入群組失敗: ' + e.message);
  }
};

const copyId = async (groupId) => {
  try {
    await navigator.clipboard.writeText(groupId);
    alert('已複製');
  } catch (e) {
    console.error(e);
  }
};

const handleLeaveGroup = async (groupId) => {
  if (!props.currentUser) return;
  if (!confirm(`確定要退出群組 ${groupId} 嗎？`)) return;

  try {
    await leaveGroup(props.currentUser.uid, groupId);
    const newGroups = { ...profile.value?.groups };
    delete newGroups[groupId];
    await setUserProfile(props.currentUser.uid, {
      ...profile.value,
      groups: newGroups,
    });
    alert('已退出群組');
    await loadGroupInfo();
    emit('group-changed', newGroups);
  } catch (e) {
    console.error('退出群組失敗:', e);
    alert('退出群組失敗: ' + e.message);
  }
};
</script>
