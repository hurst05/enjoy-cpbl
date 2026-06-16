<template>
  <div class="app-layout">
    <div class="sidebar-overlay hide-on-desktop" v-if="isMobileMenuOpen" @click="isMobileMenuOpen = false"></div>
    
    <!-- ===== Left Sidebar ===== -->
    <aside class="sidebar" :class="{ 'open': isMobileMenuOpen }">
      <div class="sidebar-header">
        <button class="btn-close-sidebar hide-on-desktop" @click="isMobileMenuOpen = false">×</button>
        <h1 class="app-title hide-on-mobile">⚾ 開心看球趣</h1>        
      </div>

      <!-- 月份切換將會透過 Teleport 傳送到這裡 -->
      <div id="sidebar-month-nav"></div>

      <div class="sidebar-functions">
        <div class="admin-section" v-if="isAdmin">
          <div class="admin-header" @click="showAdminMenu = !showAdminMenu">
            <span class="admin-title">👑 管理員專區</span>
            <span class="admin-icon">{{ showAdminMenu ? '▼' : '▶' }}</span>
          </div>
          <div class="admin-menu" v-show="showAdminMenu">
            <button class="btn-sync btn-full" title="批次主題日設定" @click="showThemeDayModal = true; isMobileMenuOpen = false">
              🎉 主題日批次管理
            </button>
            <button class="btn-sync btn-full" title="帳號管理" @click="showAdminUsersModal = true; isMobileMenuOpen = false">
              🗑️ 帳號管理
            </button>
            <button class="btn-sync btn-full" title="管理售票時程" @click="showTicketScheduleModal = true; isMobileMenuOpen = false">
              🎟️ 售票時程管理
            </button>
          </div>
        </div>

        <div class="sidebar-filters">
          <div class="filter-group">
            <label>選擇球隊</label>
            <select v-model="filters.team" class="filter-select">
              <option value="">-- 所有球隊 --</option>
              <option v-for="team in availableTeams" :key="team.id" :value="team.id">{{ team.name }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label>選擇地點</label>
            <select v-model="filters.location" class="filter-select">
              <option value="">-- 所有地點 --</option>
              <option v-for="loc in availableLocations" :key="loc" :value="loc">{{ loc }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="cheerleader-label-wrapper">
              <span class="label-text">選擇啦啦隊</span>
              <a href="https://lala.pythings.dev/" target="_blank" class="external-reference-link" title="班表參考">
                班表參考
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="external-icon"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            </label>
            <select v-model="filters.cheerTeam" class="filter-select" @change="filters.cheerMembers = []">
              <option value="">-- 所有啦啦隊伍 --</option>
              <option v-for="team in availableCheerTeams" :key="team" :value="team">{{ team }}</option>
            </select>
            
            <div v-if="filters.cheerTeam" class="custom-multi-select" ref="cheerSelectRef">
              <div class="select-header" @click="showCheerMembersMenu = !showCheerMembersMenu">
                <span class="select-text">
                  {{ filters.cheerMembers.length ? `已選擇 ${filters.cheerMembers.length} 位成員` : '-- 選擇特定成員 --' }}
                </span>
                <span class="select-icon">{{ showCheerMembersMenu ? '▲' : '▼' }}</span>
              </div>
              <div class="select-dropdown" v-show="showCheerMembersMenu">
                <label class="select-option" v-for="member in cheerTeamMembers[filters.cheerTeam]" :key="member">
                  <input type="checkbox" :value="member" v-model="filters.cheerMembers" />
                  <span class="option-text">{{ member }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="filter-group" v-if="currentUser">
            <label>標記篩選</label>
            <div class="custom-multi-select" ref="marksSelectRef">
              <div class="select-header" @click="showMarksMenu = !showMarksMenu">
                <span class="select-text">
                  {{ filters.marks.length ? `已選擇 ${filters.marks.length} 項標記` : '-- 選擇標記 --' }}
                </span>
                <span class="select-icon">{{ showMarksMenu ? '▲' : '▼' }}</span>
              </div>
              <div class="select-dropdown" v-show="showMarksMenu">
                <label class="select-option" v-for="mark in availableMarks" :key="mark.id">
                  <input type="checkbox" :value="mark.id" v-model="filters.marks" />
                  <span class="option-text">{{ mark.label }}</span>
                </label>
              </div>
            </div>
          </div>
          
          <button v-if="isFilterActive" @click="clearFilters" class="btn-clear-filters">清除篩選</button>
        </div>

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
            <button v-if="!isAdmin && !isGoogleLinked" class="btn-auth btn-ghost btn-full" title="綁定 Google 帳號" @click="handleLinkGoogle(); isMobileMenuOpen = false">🔗 綁定 Google</button>
            <button v-if="!isAdmin && isGoogleLinked" class="btn-auth btn-ghost btn-full" title="解除綁定 Google 帳號" @click="handleUnlinkGoogle(); isMobileMenuOpen = false">🚫 解除綁定 Google</button>
            <button class="btn-auth btn-ghost btn-full" title="我的標記清單" @click="showMyMarksModal = true; isMobileMenuOpen = false">⭐ 我的標記</button>
            <button class="btn-auth btn-ghost btn-full" title="群組管理" @click="showGroupPanel = !showGroupPanel; isMobileMenuOpen = false">👥 群組管理</button>
            <button class="btn-auth btn-ghost btn-full" @click="handleLogout(); isMobileMenuOpen = false">登出</button>
          </template>
          <template v-else>
            <button class="btn-auth btn-full" @click="showAuthModal = true; isMobileMenuOpen = false">登入</button>
          </template>
        </div>
      </div>
    </aside>

    <!-- ===== Main Content ===== -->
    <main class="main-content">
      <div class="mobile-header hide-on-desktop">
        <button class="btn-hamburger" @click="isMobileMenuOpen = true">☰</button>
        <h1 class="app-title">⚾ 開心看球趣</h1>
      </div>
      
      <Calendar 
        v-if="isMounted"
        :scheduleData="scheduleData" 
        :cheerleaderData="cheerleaderData" 
        :userMarks="userMarks" 
        :groupMarks="groupMarks"
        :ticketRules="ticketRules"
        :isAdmin="isAdmin"
        :isFilterActive="isFilterActive"
        :matchedGameIds="matchedGameIds"
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
      :highlightCheerMembers="filters.cheerMembers"
      @close="closeGameModal"
      @mark="onMarkGame"
      @game-updated="loadScheduleData"
    />

    <AuthModal 
      v-if="showAuthModal" 
      @close="showAuthModal = false" 
      @setup-complete="onGoogleSetupComplete"
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

    <MyMarksModal
      v-if="showMyMarksModal"
      :scheduleData="scheduleData"
      :userMarks="userMarks"
      :cheerleaderData="cheerleaderData"
      :groupMarks="groupMarks"
      @close="showMyMarksModal = false"
      @game-click="handleGameClick"
    />

    <TicketScheduleModal
      v-if="showTicketScheduleModal"
      @close="showTicketScheduleModal = false"
      @saved="loadTicketRules"
    />

    <AdminUsersModal v-if="showAdminUsersModal" @close="showAdminUsersModal = false" />

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
import AdminUsersModal from './components/AdminUsersModal.vue';
import MyMarksModal from './components/MyMarksModal.vue';

// Composables
import { useAuth } from './composables/useAuth';
import { useSchedules } from './composables/useSchedules';
import { useMarks } from './composables/useMarks';
import { useFilters } from './composables/useFilters';

// 1. 初始化資料載入 (Marks & Groups)
const { userMarks, groupMarks, loadUserMarksData, loadGroupData, handleMark } = useMarks();

// 2. 初始化認證
const { currentUser, userProfile, isAdmin, isGoogleLinked, initAuth, handleLogout, handleLinkGoogle, handleUnlinkGoogle, loadUserData } = useAuth(loadUserMarksData);

// 3. 初始化賽程
const { scheduleData, cheerleaderData, ticketRules, isMounted, loadTicketRules, loadScheduleData, initSchedules } = useSchedules();

// 4. 初始化篩選器
const {
  filters,
  availableMarks,
  availableTeams,
  availableLocations,
  availableCheerTeams,
  cheerTeamMembers,
  isFilterActive,
  matchedGameIds,
  clearFilters
} = useFilters(scheduleData, cheerleaderData, userMarks, groupMarks);

// UI 狀態 (Modals & Menus)
const showAuthModal = ref(false);
const showGroupPanel = ref(false);
const showThemeDayModal = ref(false);
const showTicketScheduleModal = ref(false);
const showAdminUsersModal = ref(false);
const showMyMarksModal = ref(false);
const showAdminMenu = ref(false);
const showCheerMembersMenu = ref(false);
const cheerSelectRef = ref(null);
const showMarksMenu = ref(false);
const marksSelectRef = ref(null);
const isMobileMenuOpen = ref(false);

const selectedGame = ref(null);
const currentTheme = ref('pastel-glass');

function setTheme(theme) {
  currentTheme.value = theme;
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('cpbl_theme', theme);
}

onMounted(async () => {
  const savedTheme = localStorage.getItem('cpbl_theme') || 'pastel-glass';
  setTheme(savedTheme);

  // 初始化認證監聽，當登入時會自動呼叫 loadUserMarksData
  initAuth();

  // 點擊外部關閉選單
  document.addEventListener('click', (e) => {
    if (cheerSelectRef.value && !cheerSelectRef.value.contains(e.target)) {
      showCheerMembersMenu.value = false;
    }
    if (marksSelectRef.value && !marksSelectRef.value.contains(e.target)) {
      showMarksMenu.value = false;
    }
  });

  await initSchedules();
});

function handleGameClick(game) {
  selectedGame.value = game;
}

function closeGameModal() {
  selectedGame.value = null;
  loadUserData();
}

async function onMarkGame(payload) {
  await handleMark(currentUser.value, payload);
}

async function onGoogleSetupComplete() {
  await loadUserData();
}
</script>
