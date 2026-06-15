import { ref, computed } from 'vue';
import { onAuthChange, getUserProfile, setUserProfile, signOutUser, linkGoogleAccount, unlinkGoogleAccount } from '../firebase.js';

export function useAuth(onUserLoaded) {
  const currentUser = ref(null);
  const userProfile = ref(null);

  const isAdmin = computed(() => userProfile.value?.isAdmin === true);

  const isGoogleLinked = computed(() => {
    if (!currentUser.value) return false;
    return currentUser.value.providerData.some(p => p.providerId === 'google.com');
  });

  async function loadUserData() {
    if (!currentUser.value) return;
    try {
      let profile = await getUserProfile(currentUser.value.uid);
      
      if (!profile) {
        const isGoogle = currentUser.value.providerData.some(p => p.providerId === 'google.com');
        if (isGoogle) {
          userProfile.value = null;
          return;
        } else {
          const displayName = currentUser.value.displayName || currentUser.value.email.split('@')[0];
          await setUserProfile(currentUser.value.uid, { displayName, marks: {} });
          profile = await getUserProfile(currentUser.value.uid);
        }
      }
      
      if (profile && profile.displayName && /[@\s]/.test(profile.displayName)) {
        const safeName = profile.displayName.replace(/[\s@]/g, '');
        await setUserProfile(currentUser.value.uid, { displayName: safeName });
        profile.displayName = safeName;
      }
      
      // Save email to RTDB to allow login mapping if it's missing
      if (profile && !profile.email && currentUser.value.email) {
        await setUserProfile(currentUser.value.uid, { email: currentUser.value.email });
        profile.email = currentUser.value.email;
      }
      
      userProfile.value = profile;

      // trigger callback for marks/groups loading
      if (onUserLoaded) {
        await onUserLoaded(currentUser.value, profile);
      }
    } catch (e) {
      console.error('載入使用者資料失敗:', e);
    }
  }

  function initAuth() {
    onAuthChange(async (user) => {
      currentUser.value = user;
      if (user) {
        await loadUserData();
      } else {
        userProfile.value = null;
        if (onUserLoaded) {
          await onUserLoaded(null, null); // clear marks
        }
      }
    });
  }

  async function handleLogout() {
    await signOutUser();
  }

  async function handleLinkGoogle() {
    try {
      await linkGoogleAccount();
      alert('Google 帳號綁定成功！此帳號未來需使用 Google 登入驗證。');
      currentUser.value = { ...currentUser.value };
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleUnlinkGoogle() {
    if (!confirm('確定要解除綁定 Google 帳號綁定嗎？您將恢復使用暱稱登入。')) return;
    try {
      const username = userProfile.value?.displayName || currentUser.value.displayName || currentUser.value.email.split('@')[0];
      await unlinkGoogleAccount(username);
      alert('Google 帳號已解除綁定！密碼已重置，您下次可直接使用暱稱登入。');
      currentUser.value = { ...currentUser.value };
    } catch (e) {
      alert(e.message);
    }
  }

  return {
    currentUser,
    userProfile,
    isAdmin,
    isGoogleLinked,
    initAuth,
    handleLogout,
    handleLinkGoogle,
    handleUnlinkGoogle,
    loadUserData
  };
}
