<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content admin-users-modal">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      <h3>🗑️ 帳號管理</h3>

      <div class="modal-body">
        <p class="warning-text">注意：刪除帳號將清除該使用者的所有標記與群組紀錄。</p>

        <div v-if="isLoading" class="loading-state">載入中...</div>
        <div v-else-if="users.length === 0" class="empty-state">目前沒有一般使用者。</div>
        
        <div v-else class="users-list">
          <div v-for="user in users" :key="user.uid" class="user-item">
            <div class="admin-user-info">
              <span class="user-name">{{ user.displayName || '未命名使用者' }}</span>
              <span class="user-id">({{ user.uid }})</span>
            </div>
            <button class="btn-delete" @click="handleDelete(user.uid, user.displayName)" :disabled="deletingUid === user.uid">
              {{ deletingUid === user.uid ? '刪除中...' : '刪除' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAllUsers, deleteUserData } from '../firebase';

const emit = defineEmits(['close']);
const users = ref([]);
const isLoading = ref(true);
const deletingUid = ref(null);

onMounted(async () => {
  await loadUsers();
});

async function loadUsers() {
  isLoading.value = true;
  try {
    const allUsersData = await getAllUsers();
    const loadedUsers = [];
    for (const [uid, data] of Object.entries(allUsersData)) {
      if (!data.isAdmin) {
        loadedUsers.push({
          uid,
          ...data
        });
      }
    }
    users.value = loadedUsers;
  } catch (err) {
    console.error('載入使用者清單失敗', err);
    alert('載入使用者清單失敗');
  } finally {
    isLoading.value = false;
  }
}

async function handleDelete(uid, displayName) {
  if (!confirm(`確定要刪除使用者 ${displayName || uid} 嗎？此操作無法復原。`)) return;
  
  deletingUid.value = uid;
  try {
    await deleteUserData(uid);
    users.value = users.value.filter(u => u.uid !== uid);
    alert('使用者已刪除');
  } catch (err) {
    console.error('刪除使用者失敗', err);
    alert('刪除失敗');
  } finally {
    deletingUid.value = null;
  }
}
</script>

<style scoped>
.admin-users-modal {
  max-width: 500px;
}

.warning-text {
  color: var(--accent-coral);
  font-size: 0.9rem;
  margin-bottom: 15px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.admin-user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-weight: bold;
  color: var(--text-primary);
}

.user-id {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.btn-delete {
  background: var(--accent-coral);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: opacity 0.2s;
}

.btn-delete:hover:not(:disabled) {
  opacity: 0.8;
}

.btn-delete:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
