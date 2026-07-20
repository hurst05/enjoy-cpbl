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
            <span>球場天氣</span>
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
              <span v-else aria-hidden="true">🌦️</span>
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
import { getCwaBallparkUrl } from '../data/ballparks.js';
import { updateThemeDay } from '../firebase.js';
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

const emit = defineEmits(['close', 'mark', 'game-updated']);

const handleOverlayClick = () => {
  if (window.innerWidth <= 768) {
    emit('close');
  }
};

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

<style lang="scss" scoped>
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
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: inherit;
    text-decoration: none;
    transition: background-color 0.2s, transform 0.2s;

    &:hover {
      background: var(--bg-hover);
      transform: translateY(-1px);
    }

    &:focus-visible {
      outline: 2px solid var(--accent-coral);
      outline-offset: 2px;
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
  .weather-period {
    grid-template-columns: 1fr auto;
    gap: 4px 8px;
  }
}
</style>
