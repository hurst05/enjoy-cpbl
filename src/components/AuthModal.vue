<template>
  <div class="modal-overlay">
    <div class="modal-content modal-auth">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      
      <div v-if="!isGoogleSetupMode">
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

        <div v-if="!isAdminMode" class="auth-divider">
          <span>或</span>
        </div>
        
        <div v-if="!isAdminMode" class="auth-buttons" style="display: flex; justify-content: center;">
          <button type="button" class="btn-google-circle" @click="handleGoogleLogin" :disabled="isLoading" title="使用 Google 登入">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Google 首次登入設定暱稱 -->
      <div v-else>
        <h3 style="margin-top: 0; margin-bottom: 20px; text-align: center;">設定您的暱稱</h3>
        <p class="auth-hint" style="margin-bottom: 20px;">這是您首次使用 Google 登入，請設定一個專屬的暱稱以建立帳號資料。</p>
        <form class="auth-form" @submit.prevent="handleGoogleSetup">
          <input 
            type="text" 
            v-model="googleNickname" 
            placeholder="請輸入您想使用的暱稱" 
            required 
          />
          <div class="auth-buttons">
            <button type="submit" class="btn-primary" :disabled="isLoading">
              {{ isLoading ? '設定中...' : '完成設定並登入' }}
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { loginAsUser, loginAsAdmin, loginWithGoogle, checkNicknameExists, getUserProfile, setUserProfile } from '../firebase.js';
import { updateProfile } from 'firebase/auth';

const emit = defineEmits(['close']);

const isAdminMode = ref(false);
const username = ref('');
const password = ref('');
const isLoading = ref(false);

const isGoogleSetupMode = ref(false);
const googleNickname = ref('');
const tempGoogleUser = ref(null);

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

const handleGoogleLogin = async () => {
  isLoading.value = true;
  try {
    const user = await loginWithGoogle();
    const profile = await getUserProfile(user.uid);
    if (profile && profile.displayName) {
      // Existing user
      emit('close');
    } else {
      // New user, setup nickname
      tempGoogleUser.value = user;
      isGoogleSetupMode.value = true;
    }
  } catch (err) {
    console.error(err);
    if (err.code !== 'auth/popup-closed-by-user') {
      alert('Google 登入失敗：' + err.message);
    }
  } finally {
    isLoading.value = false;
  }
};

const handleGoogleSetup = async () => {
  if (!googleNickname.value) return;
  isLoading.value = true;
  try {
    const isTaken = await checkNicknameExists(googleNickname.value);
    if (isTaken) {
      alert('此暱稱已被使用，若這是您的帳號，請先用一般登入後再進行綁定，或嘗試其他暱稱。');
      return;
    }
    await updateProfile(tempGoogleUser.value, { displayName: googleNickname.value });
    await setUserProfile(tempGoogleUser.value.uid, { displayName: googleNickname.value, marks: {} });
    emit('close');
  } catch (err) {
    alert('設定失敗：' + err.message);
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
.auth-divider {
  text-align: center;
  margin: 15px 0;
  position: relative;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background-color: var(--border-color);
}
.auth-divider::before { left: 0; }
.auth-divider::after { right: 0; }
.auth-divider span {
  background-color: var(--card-bg, white);
  padding: 0 10px;
  color: var(--text-color);
  font-size: 14px;
  opacity: 0.7;
}
.btn-google-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: white;
  border: 1px solid #dadce0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s, box-shadow 0.2s;
  padding: 0;
}
.btn-google-circle:hover {
  background-color: #f8f9fa;
  box-shadow: 0 1px 3px rgba(60,64,67,0.3);
}
</style>
