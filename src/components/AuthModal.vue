<template>
  <div class="modal-overlay" @click.self="handleOverlayClick">
    <div class="modal-content modal-auth">
      <button class="modal-close" aria-label="關閉" @click="handleClose">✕</button>
      
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
            <img :src="googleIconUrl" alt="" width="24" height="24" aria-hidden="true" />
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
import { loginAsUser, loginAsAdmin, loginWithGoogle, checkNicknameExists, getUserProfile, setUserProfile, signOutUser } from '../firebase.js';
import { updateProfile } from 'firebase/auth';
import googleIconUrl from '../assets/icons/google.svg';

const emit = defineEmits(['close', 'setup-complete']);

const isAdminMode = ref(false);
const username = ref('');
const password = ref('');
const isLoading = ref(false);

const isGoogleSetupMode = ref(false);
const googleNickname = ref('');
const tempGoogleUser = ref(null);

const handleOverlayClick = () => {
  if (window.innerWidth <= 768) {
    handleClose();
  }
};

const handleClose = async () => {
  if (isGoogleSetupMode.value) {
    console.warn('Google setup abandoned manually. Signing out.');
    await signOutUser();
    tempGoogleUser.value = null;
    isGoogleSetupMode.value = false;
    googleNickname.value = '';
    window.isLoggingInWithGoogle = false;
  }
  emit('close');
};

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
      if (/[@\s]/.test(username.value)) {
        throw new Error('暱稱不能包含空白或 @ 符號');
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
    window.isLoggingInWithGoogle = true;
    const user = await loginWithGoogle();
    
    const profile = await getUserProfile(user.uid);
    if (profile && profile.displayName) {
      // Existing user
      window.isLoggingInWithGoogle = false;
      emit('close');
    } else {
      // New user, setup nickname
      tempGoogleUser.value = user;
      googleNickname.value = (user.displayName || '').replace(/\s+/g, '');
      isGoogleSetupMode.value = true;
    }
  } catch (err) {
    window.isLoggingInWithGoogle = false;
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
  if (/[@\s]/.test(googleNickname.value)) {
    alert('暱稱不能包含空白或 @ 符號，請修改');
    return;
  }
  isLoading.value = true;
  try {
    const isTaken = await checkNicknameExists(googleNickname.value);
    if (isTaken) {
      alert('此暱稱已被使用，若這是您的帳號，請先用一般登入後再進行綁定，或嘗試其他暱稱。');
      return;
    }
    await updateProfile(tempGoogleUser.value, { displayName: googleNickname.value });
    await setUserProfile(tempGoogleUser.value.uid, { displayName: googleNickname.value, marks: {} });
    window.isLoggingInWithGoogle = false;
    emit('setup-complete');
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
