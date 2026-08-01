<template>
  <div class="modal-overlay" @click.self="handleOverlayClick">
    <div class="modal-content modal-large">
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
            <div class="modal-date-time" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>📅 {{ game.date }} {{ game.dayOfWeek || '' }} &nbsp;&nbsp;|&nbsp;&nbsp; ⏰ {{ game.time || '時間未定' }}</span>
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

        <div v-if="weatherModel" class="modal-section weather-section">
          <div class="modal-section-title weather-section-title">
            <span class="weather-title-symbol">☀️</span>
            <span style="flex: 1;">球場天氣</span>
            <a
              :href="cwaBallparkUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="weather-title-link"
              :aria-label="`查看${game.location}的中央氣象署球場天氣`"
              :title="`查看${game.location}的中央氣象署球場天氣`"
            >
              <img
                v-if="weatherIconUrl"
                :src="weatherIconUrl"
                :alt="weatherModel.gamePeriod.weather"
                class="weather-title-icon"
              />
              <span v-else class="weather-title-icon-fallback" aria-hidden="true">🌦️</span>
              <span class="weather-link-hint">氣象署 ↗</span>
            </a>
          </div>
          <p v-if="weatherModel.freshness === 'stale'" class="weather-warning">
            ⚠️ 天氣資料可能已過期
          </p>
          <p v-else-if="weatherModel.freshness === 'expired'" class="weather-warning">
            ⚠️ 天氣無法更新，以下為最後取得的預報
          </p>
          <p v-if="weatherModel.mode === 'tbd'" class="weather-note">開賽時間未定，顯示當日趨勢。</p>
          <div class="weather-periods">
            <div v-for="period in weatherModel.periods" :key="period.startAt" class="weather-period">
              <span class="weather-period-time">{{ formatWeatherPeriod(period) }}</span>
              <span class="weather-period-text">{{ period.weather }}</span>
              <span>降雨 {{ period.rainProbability ?? '—' }}%</span>
              <span
                v-if="period.minTemperature != null || period.maxTemperature != null"
                class="weather-period-temperature"
              >
                {{ period.minTemperature ?? period.maxTemperature }}–{{ period.maxTemperature ?? period.minTemperature }}°C
              </span>
            </div>
          </div>
          <div class="weather-meta">
            <span>發布：{{ formatWeatherDateTime(weatherModel.sourceIssuedAt) }}</span>
            <span>同步：{{ formatWeatherDateTime(weatherModel.fetchedAt) }}</span>
          </div>
        </div>

        <!-- Cheerleader Section -->
        <div class="modal-section" v-if="cheers">
          <div class="modal-section-title">
            <SvgIcon name="cheer" size="1.3em" style="color: var(--accent-coral); margin-right: 4px; --svg-icon-fill: var(--bg-card);" />
            啦啦隊應援名單
            <span v-if="cheers.isFallback" style="font-size: 0.8em; color: var(--text-secondary); margin-left: 4px; font-weight: normal;">(此為原訂日期班表)</span>
          </div>
          
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

          <div v-if="restSeatDisplay" class="modal-cheer-group">
            <div class="modal-cheer-team">🪑 {{ restSeatDisplay.label }}</div>
            <div class="modal-cheer-members">
              <span
                v-for="member in restSeatDisplay.members"
                :key="member"
                class="cheer-member cheer-member-rest-seat"
              >{{ member }}</span>
              <span v-if="restSeatDisplay.members.length === 0" class="modal-empty">尚無可顯示名單</span>
            </div>
          </div>
        </div>
        <div class="modal-section" v-else>
          <div class="modal-section-title">
            <SvgIcon name="cheer" size="1.3em" style="color: var(--accent-coral); margin-right: 4px; --svg-icon-fill: var(--bg-card);" />
            啦啦隊
          </div>
          <p class="modal-empty">尚無班表資料</p>
        </div>

        <!-- Saved & Friend Game Notes Section -->
        <div v-if="currentUser && (savedGameNote || friendGameNotes.length > 0)" class="modal-section game-note-display-section">
          <div v-if="savedGameNote" class="own-game-note-preview">
            <div class="friend-game-note-name">已儲存備註</div>
            <div class="friend-game-note-content">
              <template
                v-for="(part, index) in splitNoteContent(savedGameNote)"
                :key="`own-note-${index}`"
              >
                <a
                  v-if="part.type === 'link'"
                  :href="part.value"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ part.value }}</a>
                <span v-else>{{ part.value }}</span>
              </template>
            </div>
          </div>

          <div v-if="friendGameNotes.length > 0" class="friend-game-notes">
            <div class="friend-game-notes-title">群友備註</div>
            <article
              v-for="friendNote in friendGameNotes"
              :key="friendNote.uid"
              class="friend-game-note"
            >
              <div class="friend-game-note-name">{{ friendNote.displayName }}</div>
              <div class="friend-game-note-content">
                <template
                  v-for="(part, index) in splitNoteContent(friendNote.note)"
                  :key="`${friendNote.uid}-${index}`"
                >
                  <a
                    v-if="part.type === 'link'"
                    :href="part.value"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ part.value }}</a>
                  <span v-else>{{ part.value }}</span>
                </template>
              </div>
            </article>
          </div>
        </div>

        <!-- Ticket Schedule Section -->
        <div class="modal-section" v-if="ticketRulesList.length > 0">
          <div class="modal-section-title">🎟️ 售票時程</div>
          <div v-for="(rule, idx) in ticketRulesList" :key="idx" class="modal-friends-row" style="display: flex; justify-content: space-between; margin-bottom: 4px; align-items: center;">
            <span class="friends-label" style="font-weight: 600; flex-grow: 1;">{{ rule.label }}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: var(--text-secondary); font-size: 0.9em;">{{ rule.dateStr }}</span>
              <a v-if="rule.originalDate" :href="getTicketGcalUrl(rule)" target="_blank" rel="noopener noreferrer" title="加入 Google 日曆" style="color: var(--text-secondary); display: inline-flex; align-items: center; text-decoration: none;">
                <SvgIcon name="calendar" size="16px" style="transition: color 0.2s;" />
              </a>
            </div>
          </div>
        </div>

        <!-- Marks & Calendar Section -->
        <div class="modal-section modal-marks">
          <div class="modal-section-title">📌 我的標記與日曆</div>
          
          <template v-if="currentUser">
            <div class="modal-mark-buttons" style="margin-bottom: 12px;">
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

            <div v-if="groupMembers.length > 0" class="group-ticket-purchase">
              <button
                type="button"
                class="btn-mark btn-group-ticket"
                :aria-expanded="showGroupTicketMembers"
                @click="showGroupTicketMembers = !showGroupTicketMembers"
              >
                🎟️ 替群友標記
              </button>
              <div v-if="showGroupTicketMembers" class="group-ticket-members">
                <label
                  v-for="member in groupMembers"
                  :key="member.uid"
                  class="group-ticket-member"
                >
                  <input
                    type="checkbox"
                    :checked="isTicketPurchasedByMe(member.userData)"
                    :disabled="isGroupTicketPending(member.uid)"
                    @change="toggleGroupTicket(member, $event.target.checked)"
                  />
                  <span>{{ member.userData.displayName || member.uid }}</span>
                  <small v-if="hasTicketPurchased(member.userData.marks?.[game.gameId])">
                    已有票
                  </small>
                  <small v-if="isGroupTicketPending(member.uid)" aria-live="polite">
                    儲存中…
                  </small>
                </label>
              </div>
            </div>
          </template>
          <div class="modal-login-hint" style="margin-top: 12px;" v-else>
            💡 登入後可標記「想看」或「已購票」
          </div>

          <div class="modal-calendar-action" style="margin-top: 12px;">
            <a :href="googleCalendarUrl" target="_blank" rel="noopener noreferrer" class="btn-gcal-premium">
              <SvgIcon name="calendar" size="20px" class="gcal-icon" />
              <span>加入 Google 日曆</span>
            </a>
          </div>
        </div>

        <!-- Game Note Input Section -->
        <div v-if="currentUser" class="modal-section game-notes-section">
          <div class="modal-section-title">📝 賽事備註</div>

          <label class="game-note-field">
            <span>我的備註</span>
            <textarea
              v-model="noteDraft"
              class="game-note-textarea"
              rows="3"
              maxlength="2000"
              placeholder="可輸入相簿、集合資訊或網址…"
              :disabled="isSavingNote"
            ></textarea>
          </label>
          <div class="game-note-actions">
            <span class="game-note-count">{{ noteDraft.length }} / 2000</span>
            <button
              type="button"
              class="btn-save-note"
              :disabled="isSavingNote || isNoteUnchanged"
              @click="saveGameNote"
            >
              {{ isSavingNote ? '儲存中…' : '儲存備註' }}
            </button>
          </div>
          <p v-if="noteError" class="game-note-error" role="alert">{{ noteError }}</p>
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
import { ref, computed, watch } from 'vue';
import { TEAMS } from '../data/defaultTeams.js';
import { getCwaBallparkUrl } from '../data/ballparks.js';
import { updateThemeDay } from '../firebase.js';
import { getFriendsBoughtList, hasTicketPurchased } from '../utils/groupMarks.js';
import {
  getFriendGameNotes,
  normalizeGameNote,
  splitNoteContent,
} from '../utils/gameNotes.js';
import { getRestSeatDisplay, isRestSeatGame } from '../utils/restSeat.js';
import {
  formatWeatherDateTime,
  formatWeatherPeriod,
  getGameWeather,
  getWeatherIconUrl,
} from '../utils/weather.js';
import SvgIcon from './SvgIcon.vue';

const props = defineProps({
  game: Object,
  cheerleaderData: Object,
  userMarks: Object,
  groupMarks: Object,
  currentUser: Object,
  ticketRules: Object,
  restSeatData: Object,
  weatherData: Object,
  isAdmin: Boolean,
  highlightCheerMembers: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'mark', 'save-note', 'game-updated']);

const handleOverlayClick = () => {
  if (window.innerWidth <= 768) {
    emit('close');
  }
};

const isEditingTheme = ref(false);
const editThemeText = ref('');
const showGroupTicketMembers = ref(false);
const pendingGroupTickets = ref(new Set());
const noteDraft = ref('');
const isSavingNote = ref(false);
const noteError = ref('');

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
const weatherModel = computed(() => getGameWeather(props.game, props.weatherData));
const weatherIconUrl = computed(() => getWeatherIconUrl(weatherModel.value?.gamePeriod));
const cwaBallparkUrl = computed(() => getCwaBallparkUrl(props.game.location));
const restSeatDisplay = computed(() => {
  if (!isRestSeatGame(props.game)) return null;

  return getRestSeatDisplay(
    props.game.gameId,
    cheers.value?.homeMembers || [],
    props.restSeatData,
  );
});

const googleCalendarUrl = computed(() => {
  const awayName = awayTeam.value.name || props.game.awayTeam;
  const homeName = homeTeam.value.name || props.game.homeTeam;
  const title = `[中華職棒] ${awayName} vs ${homeName}`;
  const location = props.game.location || '';
  
  const time = (props.game.time && props.game.time !== 'TBD') ? props.game.time : '17:05';
  const dStart = new Date(`${props.game.date}T${time}:00+08:00`);
  const dEnd = new Date(dStart.getTime() + 4 * 60 * 60 * 1000);

  const formatUrlTime = (d) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const dates = `${formatUrlTime(dStart)}/${formatUrlTime(dEnd)}`;
  
  let details = `中華職棒例行賽：${awayName} vs ${homeName}\n`;
  if (props.game.gameNumber) details += `場次：${props.game.gameNumber}\n`;
  if (props.game.themeDay) details += `主題日：${props.game.themeDay}\n`;

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.append('action', 'TEMPLATE');
  url.searchParams.append('text', title);
  url.searchParams.append('dates', dates);
  url.searchParams.append('details', details);
  url.searchParams.append('location', location);
  
  return url.toString();
});

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
    return { label: rule.label, dateStr, originalDate: rule.date };
  }).sort((a, b) => {
    if (!a.originalDate && !b.originalDate) return 0;
    if (!a.originalDate) return 1;
    if (!b.originalDate) return -1;
    return new Date(a.originalDate) - new Date(b.originalDate);
  });
});

const getTicketGcalUrl = (rule) => {
  if (!rule.originalDate) return '#';
  
  const awayName = awayTeam.value.name || props.game.awayTeam;
  const homeName = homeTeam.value.name || props.game.homeTeam;
  const title = `[售票] ${awayName} vs ${homeName} - ${rule.label}`;
  
  const dStart = new Date(rule.originalDate);
  const dEnd = new Date(dStart.getTime() + 15 * 60 * 1000);

  const formatUrlTime = (d) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const dates = `${formatUrlTime(dStart)}/${formatUrlTime(dEnd)}`;
  
  let details = `中華職棒售票：${awayName} vs ${homeName}\n`;
  details += `售票階段：${rule.label}\n`;
  if (props.game.gameNumber) details += `場次：${props.game.gameNumber}\n`;

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.append('action', 'TEMPLATE');
  url.searchParams.append('text', title);
  url.searchParams.append('dates', dates);
  url.searchParams.append('details', details);
  
  return url.toString();
};

const marks = computed(() => props.userMarks?.[props.game.gameId] || {});
const wantToWatch = computed(() => marks.value.wantToWatch);
const ticketPurchased = computed(() => marks.value.ticketPurchased);
const savedGameNote = computed(() => normalizeGameNote(marks.value.note));
const isNoteUnchanged = computed(() => normalizeGameNote(noteDraft.value) === savedGameNote.value);
const friendGameNotes = computed(() => getFriendGameNotes(
  props.groupMarks,
  props.game.gameId,
  props.currentUser?.uid,
));
const groupMembers = computed(() => Object.entries(props.groupMarks || {})
  .filter(([uid]) => uid !== props.currentUser?.uid)
  .map(([uid, userData]) => ({ uid, userData })));

const wantList = computed(() => {
  if (!props.groupMarks) return [];
  const list = [];
  Object.entries(props.groupMarks).forEach(([uid, userData]) => {
    if (uid !== props.currentUser?.uid && userData.marks?.[props.game.gameId]?.wantToWatch) {
      list.push(userData.displayName || uid);
    }
  });
  return list;
});

const boughtList = computed(() => getFriendsBoughtList(
  props.groupMarks,
  props.game.gameId,
  props.currentUser?.uid,
));

watch(savedGameNote, (note) => {
  if (!isSavingNote.value) noteDraft.value = note;
}, { immediate: true });

const saveGameNote = () => {
  if (!props.currentUser || isSavingNote.value) return;

  isSavingNote.value = true;
  noteError.value = '';
  emit('save-note', {
    gameId: props.game.gameId,
    note: noteDraft.value,
    done: (error, savedNote) => {
      isSavingNote.value = false;
      if (error) {
        noteError.value = `儲存失敗：${error.message}`;
        return;
      }

      noteDraft.value = savedNote || '';
    },
  });
};

const isTicketPurchasedByMe = (userData) => Boolean(
  userData.marks?.[props.game.gameId]?.ticketPurchasedBy?.[props.currentUser?.uid],
);

const isGroupTicketPending = (uid) => pendingGroupTickets.value.has(uid);

const toggleGroupTicket = (member, value) => {
  const groupId = member.userData.groupIds?.[0];
  if (!groupId) {
    alert('找不到共同群組，請重新整理後再試');
    return;
  }

  pendingGroupTickets.value = new Set([...pendingGroupTickets.value, member.uid]);
  emit('mark', {
    gameId: props.game.gameId,
    markType: 'ticketPurchased',
    value,
    targetUid: member.uid,
    groupId,
    done: (error) => {
      const next = new Set(pendingGroupTickets.value);
      next.delete(member.uid);
      pendingGroupTickets.value = next;
      if (error) alert('標記群友已購票失敗：' + error.message);
    },
  });
};

const toggleWantToWatch = () => {
  emit('mark', { gameId: props.game.gameId, markType: 'wantToWatch', value: !wantToWatch.value });
};

const toggleTicketPurchased = () => {
  emit('mark', { gameId: props.game.gameId, markType: 'ticketPurchased', value: !ticketPurchased.value });
};
</script>

<style lang="scss" scoped>
.game-note-field {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 700;
}

.game-note-textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 84px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-hover);
  color: var(--text-primary);
  font: inherit;
  line-height: 1.5;
  resize: vertical;

  &:focus-visible {
    outline: 2px solid var(--accent-coral);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
}

.game-note-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.game-note-count {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.btn-save-note {
  padding: 8px 14px;
  border: 0;
  border-radius: 9px;
  background: var(--accent-coral);
  color: #fff;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.game-note-error {
  margin: 8px 0 0;
  color: #c62828;
  font-size: 0.85rem;
}

.game-note-display-section {
  display: grid;
  gap: 14px;
}

.own-game-note-preview {
  margin-top: 0;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-card);
}

.friend-game-notes {
  display: grid;
  gap: 8px;
  margin-top: 0;
}

.friend-game-notes-title {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 700;
}

.friend-game-note {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-hover);
}

.friend-game-note-name {
  margin-bottom: 4px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 700;
}

.friend-game-note-content {
  color: var(--text-primary);
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;

  a {
    color: var(--accent-coral);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}

.group-ticket-purchase {
  margin-bottom: 12px;
}

.btn-group-ticket {
  width: 100%;
}

.group-ticket-members {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.group-ticket-member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-hover);
  cursor: pointer;

  small {
    margin-left: auto;
    color: var(--text-secondary);
  }

  &:has(input:disabled) {
    cursor: wait;
    opacity: 0.7;
  }
}

.weather-section {
  .weather-section-title {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .weather-title-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 12px;
    background: var(--bg-hover);
    color: var(--text-secondary);
    text-decoration: none;
    transition: background-color 0.2s, transform 0.2s, box-shadow 0.2s;

    &:hover {
      background: var(--bg-card);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      color: var(--text-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--accent-coral);
      outline-offset: 2px;
    }

    .weather-link-hint {
      font-size: 0.75rem;
      font-weight: bold;
      opacity: 0.9;
    }
  }

  .weather-title-icon {
    display: block;
    width: 20px;
    height: 20px;
    filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.3));
  }

  .weather-warning {
    margin: 0 0 8px;
    color: var(--accent-coral);
    font-weight: 700;
  }

  .weather-note {
    margin: 0 0 8px;
    color: var(--text-secondary);
  }
}

.weather-periods {
  display: grid;
  gap: 6px;
}

.weather-period {
  display: grid;
  grid-template-columns: minmax(90px, auto) 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 7px 9px;
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.weather-period-time,
.weather-period-text {
  color: var(--text-primary);
  font-weight: 700;
}

.weather-period-text,
.weather-period-temperature {
  justify-self: end;
  text-align: right;
}

.weather-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.72rem;
}

@media (max-width: 768px) {
  .game-note-actions {
    justify-content: space-between;
  }

  .btn-save-note {
    min-height: 42px;
  }

  .weather-period {
    grid-template-columns: 1fr auto;
    gap: 4px 8px;
  }
}
</style>
