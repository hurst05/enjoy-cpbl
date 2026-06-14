<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content modal-auth">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      
      <div class="auth-tabs">
        <button :class="['auth-tab', { active: !isAdminMode }]" @click="isAdminMode = false">一般登入</button>
        <button :class="['auth-tab', { active: isAdminMode }]" @click="isAdminMode = true">管理員</button>
      </div>

      <form class="auth-form" @submit.prevent="handleLogin">
        <input 
          v-if="!isAdminMode"
          type="text" 
          v-model="username" 
          placeholder="請輸入您的暱稱 / 帳號" 
          required 
          autocomplete="username" 
        />
        <input 
          v-if="isAdminMode"
          type="password" 
          v-model="password" 
          placeholder="密碼" 
          required 
          autocomplete="current-password" 
        />
        
        <div class="auth-buttons">
          <button type="submit" class="btn-primary" :disabled="isLoading">
            {{ isLoading ? '登入中...' : '登入' }}
          </button>
        </div>
        <p v-if="!isAdminMode" class="auth-hint">只需輸入您專屬的暱稱即可，未來同帳號可同步標記資料。</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { loginAsUser, loginAsAdmin } from '../firebase.js';

const emit = defineEmits(['close']);

const isAdminMode = ref(false);
const username = ref('');
const password = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  isLoading.value = true;
  try {
    if (isAdminMode.value) {
      if (!password.value) {
        throw new Error('請輸入管理員密碼');
      }
      await loginAsAdmin(password.value);
    } else {
      if (!username.value) {
        throw new Error('請輸入暱稱');
      }
      await loginAsUser(username.value);
    }
    emit('close');
  } catch (err) {
    alert(err.message);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.auth-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--border-color);
}
.auth-tab {
  flex: 1;
  background: none;
  border: none;
  padding: 10px;
  font-size: 16px;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.6;
}
.auth-tab.active {
  opacity: 1;
  font-weight: bold;
  border-bottom: 2px solid var(--primary-color);
  margin-bottom: -2px;
}
.auth-hint {
  font-size: 12px;
  color: #666;
  text-align: center;
  margin-top: 10px;
}
</style>
