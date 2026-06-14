<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      <div id="modal-body">
        <div class="modal-game-header">
          <div class="modal-matchup">
            <div class="modal-team">
              <div class="modal-team-circle" :style="{ background: awayTeam.color, color: awayTeam.textColor || '#fff' }">
                {{ awayTeam.short || awayTeam.name }}
              </div>              
            </div>            
            <div class="modal-center-info" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
              <div class="modal-game-number" v-if="game.gameNumber" style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); white-space: nowrap;">⚾ 場次：{{ game.gameNumber }}</div>
              <div class="modal-location" style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap;">📍 {{ game.location || '場地未定' }}</div>
            </div>
            <div class="modal-team">
              <div class="modal-team-circle" :style="{ background: homeTeam.color, color: homeTeam.textColor || '#fff' }">
                {{ homeTeam.short || homeTeam.name }}
              </div>              
            </div>
          </div>
          <div class="modal-game-info">
            <div class="modal-date-time">
              📅 {{ game.date }} {{ game.dayOfWeek || '' }} &nbsp;&nbsp;|&nbsp;&nbsp; ⏰ {{ game.time || '時間未定' }}
            </div>
            <!-- Theme Day Section -->
            <div class="modal-theme-wrapper" style="margin-top: 8px;">
              <div v-if="!isEditingTheme" class="modal-theme">
                <span v-if="game.themeDay">🎉 {{ game.themeDay }}</span>
                <span v-else-if="isAdmin" style="color:#aaa; font-size:14px; font-style:italic;">(未設定主題日)</span>
                <button v-if="isAdmin" class="btn-edit-theme" @click="startEditTheme" title="編輯主題日">✏️</button>
              </div>
              <div v-else class="modal-theme-edit">
                <input type="text" v-model="editThemeText" placeholder="輸入主題日名稱" class="theme-input" />
                <button class="btn-save-theme" @click="saveThemeDay">儲存</button>
                <button class="btn-cancel-theme" @click="isEditingTheme = false">取消</button>
              </div>
            </div>

            <div v-if="game.status === 'postponed'" class="modal-postponed">⚠️ 延賽</div>
          </div>
        </div>

        <!-- Cheerleader Section -->
        <div class="modal-section" v-if="cheers">
          <div class="modal-section-title">💃 啦啦隊應援名單</div>
          
          <div v-if="cheers.homeMembers?.length" class="modal-cheer-group">
            <div class="modal-cheer-team" :style="{ color: homeTeam.color }">{{ homeTeam.cheerName || homeTeam.name || '主場' }}</div>
            <div class="modal-cheer-members">
              <span 
                v-for="member in cheers.homeMembers" 
                :key="member" 
                class="cheer-member"
                :class="{ 'cheer-member-highlighted': highlightCheerMembers.includes(member) }"
              >{{ member }}</span>
            </div>
          </div>
          
          <div v-if="cheers.awayMembers?.length" class="modal-cheer-group">
            <div class="modal-cheer-team" :style="{ color: awayTeam.color }">{{ awayTeam.cheerName || awayTeam.name || '客場' }}</div>
            <div class="modal-cheer-members">
              <span 
                v-for="member in cheers.awayMembers" 
                :key="member" 
                class="cheer-member"
                :class="{ 'cheer-member-highlighted': highlightCheerMembers.includes(member) }"
              >{{ member }}</span>
            </div>
          </div>
        </div>
        <div class="modal-section" v-else>
          <div class="modal-section-title">💃 啦啦隊</div>
          <p class="modal-empty">尚無班表資料</p>
        </div>

        <!-- Ticket Schedule Section -->
        <div class="modal-section" v-if="ticketRulesList.length > 0">
          <div class="modal-section-title">🎟️ 售票時程</div>
          <div v-for="(rule, idx) in ticketRulesList" :key="idx" class="modal-friends-row" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span class="friends-label" style="font-weight: 600; width: 60%;">{{ rule.label }}</span>
            <span style="color: var(--text-secondary); font-size: 0.9em;">{{ rule.dateStr }}</span>
          </div>
        </div>

        <!-- Marks Section -->
        <div class="modal-section modal-marks" v-if="currentUser">
          <div class="modal-section-title">📌 我的標記</div>
          <div class="modal-mark-buttons">
            <button 
              class="btn-mark" 
              :class="{ active: wantToWatch }"
              @click="toggleWantToWatch"
            >
              {{ wantToWatch ? '❤️ 已標記想看' : '🤍 想看' }}
            </button>
            <button 
              class="btn-mark" 
              :class="{ active: ticketPurchased }"
              @click="toggleTicketPurchased"
            >
              {{ ticketPurchased ? '✅ 已購票' : '🎟️ 標記已購票' }}
            </button>
          </div>
        </div>
        <div class="modal-login-hint" v-else>
          💡 登入後可標記「想看」或「已購票」
        </div>

        <!-- Friends Section -->
        <div class="modal-section" v-if="wantList.length > 0 || boughtList.length > 0">
          <div class="modal-section-title">👥 好友狀態</div>
          <div v-if="wantList.length > 0" class="modal-friends-row">
            <span class="friends-label">❤️ 想看：</span>{{ wantList.join('、') }}
          </div>
          <div v-if="boughtList.length > 0" class="modal-friends-row">
            <span class="friends-label">✅ 已購票：</span>{{ boughtList.join('、') }}
          </div>
        </div>

        <a v-if="game.cpblLink" :href="game.cpblLink" target="_blank" rel="noopener noreferrer" class="modal-cpbl-link">🔗 CPBL 比賽資訊</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { TEAMS } from '../data/defaultTeams.js';
import { updateThemeDay } from '../firebase.js';

const props = defineProps({
  game: Object,
  cheerleaderData: Object,
  userMarks: Object,
  groupMarks: Object,
  currentUser: Object,
  ticketRules: Object,
  isAdmin: Boolean,
  highlightCheerMembers: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'mark', 'game-updated']);

const isEditingTheme = ref(false);
const editThemeText = ref('');

const startEditTheme = () => {
  editThemeText.value = props.game.themeDay || '';
  isEditingTheme.value = true;
};

const saveThemeDay = async () => {
  try {
    const val = editThemeText.value.trim() || null;
    await updateThemeDay(props.game.gameId, val);
    isEditingTheme.value = false;
    emit('game-updated');
  } catch (err) {
    alert('儲存主題日失敗：' + err.message);
  }
};

const homeTeam = computed(() => TEAMS[props.game.homeTeam] || { name: props.game.homeTeam, color: '#999' });
const awayTeam = computed(() => TEAMS[props.game.awayTeam] || { name: props.game.awayTeam, color: '#999' });
const cheers = computed(() => props.cheerleaderData?.[props.game.gameId]);

const ticketRulesList = computed(() => {
  if (!props.game.gameNumber || props.game.gameNumber <= 180) {
    return []; // 上半季不顯示
  }

  let rules = props.ticketRules?.gameSpecific?.[props.game.gameId];
  
  if (!rules || rules.length === 0) {
    const isDome = props.game.location?.includes('巨蛋');
    const type = isDome ? 'dome' : 'normal';
    rules = props.ticketRules?.['2026']?.['H2']?.[props.game.homeTeam]?.[type];
  }

  if (!rules || rules.length === 0) {
    return [];
  }

  return rules.map(rule => {
    let dateStr = '未定';
    if (rule.date) {
      const d = new Date(rule.date);
      dateStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    return { label: rule.label, dateStr };
  });
});

const marks = computed(() => props.userMarks?.[props.game.gameId] || {});
const wantToWatch = computed(() => marks.value.wantToWatch);
const ticketPurchased = computed(() => marks.value.ticketPurchased);

const wantList = computed(() => {
  if (!props.groupMarks) return [];
  const list = [];
  Object.entries(props.groupMarks).forEach(([uid, userData]) => {
    if (userData.marks?.[props.game.gameId]?.wantToWatch) {
      list.push(userData.displayName || uid);
    }
  });
  return list;
});

const boughtList = computed(() => {
  if (!props.groupMarks) return [];
  const list = [];
  Object.entries(props.groupMarks).forEach(([uid, userData]) => {
    if (userData.marks?.[props.game.gameId]?.ticketPurchased) {
      list.push(userData.displayName || uid);
    }
  });
  return list;
});

const toggleWantToWatch = () => {
  emit('mark', { gameId: props.game.gameId, markType: 'wantToWatch', value: !wantToWatch.value });
};

const toggleTicketPurchased = () => {
  emit('mark', { gameId: props.game.gameId, markType: 'ticketPurchased', value: !ticketPurchased.value });
};
</script>
