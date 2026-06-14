<template>
  <div class="app-layout">
    <!-- ===== Left Sidebar ===== -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="app-title">⚾ 開心看球趣</h1>
        <span class="app-subtitle">CPBL 2026</span>
      </div>

      <!-- 月份切換將會透過 Teleport 傳送到這裡 -->
      <div id="sidebar-month-nav"></div>

      <div class="sidebar-functions">
        <div class="sync-buttons" v-if="isAdmin">
          <button class="btn-sync btn-full" title="同步最新賽程" @click="handleSyncSchedules" :disabled="isSyncing">
            <span class="sync-icon">⚾</span>
            <span class="sync-text">更新賽程資料</span>
          </button>
          <button class="btn-sync btn-full" title="同步啦啦隊班表" @click="handleSyncCheerleaders" :disabled="isSyncing" style="margin-top: 10px;">
            <span class="sync-icon">{{ isScrapeStarted ? '⏳' : '💃' }}</span>
            <span class="sync-text">{{ isScrapeStarted ? '正在更新班表...' : '更新啦啦隊班表' }}</span>
          </button>
        </div>
        <button v-if="isAdmin" class="btn-sync btn-full" title="批次主題日設定" @click="showThemeDayModal = true" style="margin-top: 10px;">
          🎉 主題日批次管理
        </button>
        <button v-if="isAdmin" class="btn-sync btn-full" title="管理售票時程" @click="showTicketScheduleModal = true" style="margin-top: 10px;">
          🎟️ 售票時程管理
        </button>

        <div class="auth-section">
          <div class="theme-switcher">
            <div class="theme-switcher-title">佈景主題 Theme</div>
            <div class="theme-options">
              <button class="theme-btn theme-btn-warm-cream" :class="{active: currentTheme === 'warm-cream'}" @click="setTheme('warm-cream')" title="暖陽燕麥"></button>
              <button class="theme-btn theme-btn-tactile" :class="{active: currentTheme === 'tactile'}" @click="setTheme('tactile')" title="質感點陣"></button>
              <button class="theme-btn theme-btn-icy-blue" :class="{active: currentTheme === 'icy-blue'}" @click="setTheme('icy-blue')" title="冷冽冰藍"></button>
              <button class="theme-btn theme-btn-mint-sage" :class="{active: currentTheme === 'mint-sage'}" @click="setTheme('mint-sage')" title="薄荷鼠尾草"></button>
              <button class="theme-btn theme-btn-soft-lilac" :class="{active: currentTheme === 'soft-lilac'}" @click="setTheme('soft-lilac')" title="丁香紫"></button>
              <button class="theme-btn theme-btn-pastel-glass" :class="{active: currentTheme === 'pastel-glass'}" @click="setTheme('pastel-glass')" title="漸層玻璃"></button>
            </div>
          </div>

          <template v-if="currentUser">
            <div class="user-info" :title="currentUser.email">
              👤 {{ isAdmin ? '👑 管理員' : (currentUser.displayName || currentUser.email.split('@')[0]) }}
            </div>
            <button class="btn-auth btn-ghost btn-full" title="群組管理" @click="showGroupPanel = !showGroupPanel">👥 群組管理</button>
            <button class="btn-auth btn-ghost btn-full" @click="handleLogout">登出</button>
          </template>
          <template v-else>
            <button class="btn-auth btn-full" @click="showAuthModal = true">登入</button>
          </template>
        </div>
      </div>
      
      <!-- Sync Status -->
      <div v-if="isSyncing" class="sync-status sidebar-sync-status">
        <span class="sync-status-text">{{ syncMessage }}</span>
      </div>
    </aside>

    <!-- ===== Main Content ===== -->
    <main class="main-content">
      <Calendar 
        v-if="isMounted"
        :scheduleData="scheduleData" 
        :cheerleaderData="cheerleaderData" 
        :userMarks="userMarks" 
        :groupMarks="groupMarks"
        :ticketRules="ticketRules"
        :isAdmin="isAdmin"
        @game-click="handleGameClick"
      />
    </main>

    <!-- ===== Modals & Panels ===== -->
    <GameModal 
      v-if="selectedGame" 
      :game="selectedGame"
      :cheerleaderData="cheerleaderData"
      :userMarks="userMarks"
      :groupMarks="groupMarks"
      :currentUser="currentUser"
      :ticketRules="ticketRules"
      :isAdmin="isAdmin"
      @close="closeGameModal"
      @mark="handleMark"
      @game-updated="loadScheduleData"
    />

    <AuthModal 
      v-if="showAuthModal" 
      @close="showAuthModal = false" 
    />

    <GroupPanel 
      v-show="showGroupPanel" 
      :currentUser="currentUser"
      @close="showGroupPanel = false"
      @group-changed="loadGroupData"
    />

    <ThemeDayModal
      v-if="showThemeDayModal"
      @close="showThemeDayModal = false"
      @saved="loadScheduleData"
    />

    <TicketScheduleModal
      v-if="showTicketScheduleModal"
      @close="showTicketScheduleModal = false"
      @saved="loadTicketRules"
    />

    <ScrapeProgressModal
      v-if="showScrapeProgressModal"
      :current="scrapeProgress.current"
      :total="scrapeProgress.total"
      :currentGame="scrapeProgress.currentGame"
      :statusMessage="scrapeProgress.statusMessage"
      :isStarted="isScrapeStarted"
      :isCancelling="isScrapeCancelling"
      :isDone="isScrapeDone"
      @start="startScrapeCheerleaders"
      @cancel="cancelScrape"
      @close="closeScrapeProgress"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Calendar from './components/Calendar.vue';
import GameModal from './components/GameModal.vue';
import AuthModal from './components/AuthModal.vue';
import GroupPanel from './components/GroupPanel.vue';
import ThemeDayModal from './components/ThemeDayModal.vue';
import TicketScheduleModal from './components/TicketScheduleModal.vue';
import ScrapeProgressModal from './components/ScrapeProgressModal.vue';

import { onAuthChange, signOutUser, getSchedules, saveSchedules, getAllCheerleaders, saveCheerleaders, getLastSync, setLastSync, getUserMarks, getUserProfile, getGroupMarks, setUserMark, getTicketSchedules, getThemeDays } from './firebase.js';
import * as scraperModule from './utils/scraper.js';
import { computed } from 'vue';

const currentUser = ref(null);
const scheduleData = ref({});
const cheerleaderData = ref({});
const userMarks = ref({});
const groupMarks = ref({});
const userProfile = ref(null);
const ticketRules = ref({});

const isAdmin = computed(() => userProfile.value?.isAdmin === true);

const isSyncing = ref(false);
const syncMessage = ref('正在更新資料...');
const showAuthModal = ref(false);
const showGroupPanel = ref(false);
const showThemeDayModal = ref(false);
const showTicketScheduleModal = ref(false);
const showScrapeProgressModal = ref(false);
const isScrapeStarted = ref(false);
const isScrapeCancelling = ref(false);
const isScrapeDone = ref(false);
const scrapeProgress = ref({
  current: 0,
  total: 0,
  currentGame: null,
  statusMessage: '準備抓取資料...'
});

const selectedGame = ref(null);
const isMounted = ref(false);
const currentTheme = ref('pastel-glass');

function setTheme(theme) {
  currentTheme.value = theme;
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('cpbl_theme', theme);
}

onMounted(async () => {
  isMounted.value = true;
  
  // Apply saved theme
  const savedTheme = localStorage.getItem('cpbl_theme') || 'pastel-glass';
  setTheme(savedTheme);

  onAuthChange(async (user) => {
    currentUser.value = user;
    if (user) {
      await loadUserData();
    } else {
      userMarks.value = {};
      groupMarks.value = {};
      userProfile.value = null;
    }
  });

  await loadTicketRules();
  await loadScheduleData();  
});

async function loadTicketRules() {
  try {
    const schedules = await getTicketSchedules();
    ticketRules.value = schedules || {};
  } catch (e) {
    console.error('載入售票時程失敗:', e);
  }
}

async function loadScheduleData() {
  try {
    const data = await getSchedules() || {};
    const themeDays = await getThemeDays() || {};
    
    // Merge theme days into schedule data
    for (const key in data) {
      data[key].themeDay = themeDays[key] || null;
    }
    
    scheduleData.value = data;

    if (selectedGame.value && data[selectedGame.value.gameId]) {
      selectedGame.value = data[selectedGame.value.gameId];
    }

    const allCheers = await getAllCheerleaders() || {};
    cheerleaderData.value = allCheers;
    isMounted.value = true;
  } catch (e) {
    console.error('載入賽程資料失敗:', e);
  }
}

async function loadUserData() {
  if (!currentUser.value) return;
  try {
    const marks = await getUserMarks(currentUser.value.uid);
    userMarks.value = marks || {};

    const profile = await getUserProfile(currentUser.value.uid);
    userProfile.value = profile;

    if (profile?.groups) {
      await loadGroupData(profile.groups);
    }
  } catch (e) {
    console.error('載入使用者資料失敗:', e);
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

async function handleLogout() {
  await signOutUser();
}

function handleGameClick(game) {
  selectedGame.value = game;
}

function closeGameModal() {
  selectedGame.value = null;
  loadUserData();
}

async function handleMark({ gameId, markType, value }) {
  if (!currentUser.value) return;
  try {
    await setUserMark(currentUser.value.uid, gameId, markType, value);
    if (!userMarks.value[gameId]) {
      userMarks.value[gameId] = {};
    }
    userMarks.value[gameId][markType] = value;
  } catch (e) {
    console.error('標記失敗:', e);
  }
}

async function checkAutoSync() {
  try {
    const lastSync = await getLastSync();
    const now = Date.now();
    const scheduleSync = lastSync?.schedule || 0;
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (now - scheduleSync > oneDayMs) {
      await handleSyncSchedules();
    }
  } catch (e) {
    console.warn('自動同步檢查失敗:', e);
  }
}

async function handleSyncSchedules() {
  isSyncing.value = true;
  syncMessage.value = '正在更新賽程...';
  
  try {
    const fbModule = { getSchedules, saveSchedules, getLastSync, setLastSync };
    const result = await scraperModule.syncSchedules(true, fbModule);

    if (result.gamesUpdated > 0) {
      await loadScheduleData();
    }

    syncMessage.value = `賽程更新完成！(更新 ${result.gamesUpdated} 場)`;
    setTimeout(() => { isSyncing.value = false; }, 3000);
  } catch (e) {
    console.error('賽程同步失敗:', e);
    syncMessage.value = '賽程同步失敗: ' + e.message;
    setTimeout(() => { isSyncing.value = false; }, 5000);
  }
}

function handleSyncCheerleaders() {
  showScrapeProgressModal.value = true;
  if (!isScrapeStarted.value && !isScrapeDone.value) {
    // 重置狀態
    isScrapeCancelling.value = false;
    scrapeProgress.value = {
      current: 0,
      total: 0,
      currentGame: null,
      statusMessage: '點擊開始以執行更新...'
    };
  }
}

async function startScrapeCheerleaders() {
  isScrapeStarted.value = true;
  isScrapeCancelling.value = false;
  isScrapeDone.value = false;
  
  try {
    const fbModule = { getSchedules, saveCheerleaders, getLastSync, setLastSync };
    const options = {
      onProgress: (info) => {
        scrapeProgress.value = info;
      },
      checkCancelled: () => isScrapeCancelling.value
    };
    
    const result = await scraperModule.syncCheerleaders(true, fbModule, options);

    if (result.cheersUpdated > 0) {
      await loadScheduleData();
    }

    scrapeProgress.value.statusMessage = isScrapeCancelling.value 
      ? `已終止。本次更新了 ${result.cheersUpdated} 場班表。` 
      : `更新完成！共更新 ${result.cheersUpdated} 場班表。`;
    
    isScrapeDone.value = true;
    isScrapeStarted.value = false;
    isScrapeCancelling.value = false;
  } catch (e) {
    console.error('班表同步失敗:', e);
    scrapeProgress.value.statusMessage = '班表同步失敗: ' + e.message;
    isScrapeDone.value = true;
    isScrapeStarted.value = false;
    isScrapeCancelling.value = false;
  }
}

function cancelScrape() {
  isScrapeCancelling.value = true;
}

function closeScrapeProgress() {
  showScrapeProgressModal.value = false;
}
</script>
