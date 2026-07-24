<template>
  <div 
    class="game-card" 
    :class="{ 
      'game-card-list': mode === 'list', 
      'game-postponed': game.status === 'postponed',
      'game-card-filtered-out': isFilterActive && !isMatched,
      'game-card-highlighted': isFilterActive && isMatched
    }"
    :style="{ 
      '--card-bg': `color-mix(in srgb, ${homeTeam.color} 15%, var(--bg-card))`,
      border: `2px solid ${homeTeam.color}`,
      backgroundColor: `var(--card-bg)`
    }"
    @click="$emit('click')"
  >
    <div class="game-matchup">
      <img v-if="awayTeam.logo" :src="awayTeam.logo" class="team-logo" :alt="awayTeam.name" :title="awayTeam.name" />
      <span v-else class="team-name-short" :style="{ color: awayTeam.color }">{{ awayTeam.short || awayTeam.name }}</span>
      
      <div class="game-center-info">
        <span class="game-time" v-if="game.time">{{ game.time }}</span>
        
        <!-- Location with Weather Tooltip on Hover -->
        <span 
          v-if="game.location" 
          class="game-location-wrapper"
          :class="{ 'tooltip-wrapper': weatherModel }"
        >
          <span class="game-location">{{ game.location }}</span>
          
          <div v-if="weatherModel" class="tooltip-card weather-tooltip-card">
            <div class="tooltip-title">{{ weatherModel.gamePeriod.weather }}</div>
            <div class="tooltip-section weather-tooltip-details">
              <span>降雨 {{ weatherModel.gamePeriod.rainProbability ?? '—' }}%</span>
              <span>{{ weatherTemperature }}</span>
            </div>
            <div v-if="weatherModel.freshness === 'stale'" class="weather-tooltip-warning">
              天氣資料可能已過期
            </div>
            <div v-else-if="weatherModel.freshness === 'expired'" class="weather-tooltip-warning">
              天氣資料無法更新
            </div>
          </div>
        </span>

        <!-- Rain / Thunder Badge -->
        <span v-if="weatherType === 'thunder'" class="rain-badge badge-thunder">⛈️ 雷雨 {{ rainProbability != null ? `${rainProbability}%` : '' }}</span>
        <span v-else-if="rainProbability != null && rainProbability >= 30" class="rain-badge">☔ {{ rainProbability }}%</span>
      </div>
      
      <img v-if="homeTeam.logo" :src="homeTeam.logo" class="team-logo" :alt="homeTeam.name" :title="homeTeam.name" />
      <span v-else class="team-name-short" :style="{ color: homeTeam.color }">{{ homeTeam.short || homeTeam.name }}</span>
    </div>

    <div v-if="game.themeDay" class="game-theme-day">🎉 {{ game.themeDay }}</div>

    <div class="game-icons">
      <!-- Cheerleader -->
      <span v-if="hasCheerData" class="tooltip-wrapper icon-cheer hide-on-mobile">
        <span class="tooltip-trigger" style="display: inline-flex; align-items: center; justify-content: center; color: var(--accent-coral);">
          <SvgIcon name="cheer" size="1.4em" style="--svg-icon-fill: var(--card-bg)" />
        </span>
        <div class="tooltip-card">
          <div class="tooltip-title">
            <SvgIcon name="cheer" size="1.3em" style="color: var(--accent-coral); margin-right: 4px; --svg-icon-fill: var(--bg-card);" />
            啦啦隊應援
            <span v-if="cheers.isFallback" style="font-size: 0.8em; color: var(--text-secondary); margin-left: 4px; font-weight: normal;">(顯示原訂日期班表)</span>
          </div>
          <div v-if="cheers.homeMembers?.length" class="tooltip-section">
            <div class="tooltip-team" :style="{ color: homeTeam.color }">{{ homeTeam.cheerName || homeTeam.name || '主隊' }}</div>
            <div class="tooltip-members">{{ cheers.homeMembers.join('、') }}</div>
          </div>
          <div v-if="cheers.awayMembers?.length" class="tooltip-section">
            <div class="tooltip-team" :style="{ color: awayTeam.color }">{{ awayTeam.cheerName || awayTeam.name || '客隊' }}</div>
            <div class="tooltip-members">{{ cheers.awayMembers.join('、') }}</div>
          </div>
          <div v-if="restSeatDisplay" class="tooltip-section">
            <div class="tooltip-team">{{ restSeatDisplay.label }}</div>
            <div class="tooltip-members">{{ restSeatDisplay.members.length ? restSeatDisplay.members.join('、') : '尚無休息區名單' }}</div>
          </div>
        </div>
      </span>

      <!-- User Marks -->
      <span v-if="markData?.wantToWatch" class="game-mark-icon mark-want" title="想看">❤️</span>
      <span v-if="hasTicketPurchased(markData)" class="game-mark-icon mark-ticket" title="已購票">✅</span>

      <!-- Friends Want -->
      <span v-if="friendsWantList.length > 0" class="tooltip-wrapper icon-friends-want">
        <span class="tooltip-trigger" style="color: #f44336; display: inline-flex; align-items: center; justify-content: center; transform: translateY(1px);">
          <SvgIcon name="group" size="1.4em" />
        </span>
        <div class="tooltip-card">
          <div class="tooltip-title">❤️ 想看的好友</div>
          <div class="tooltip-section">{{ friendsWantList.join('、') }}</div>
        </div>
      </span>

      <!-- Friends Bought -->
      <span v-if="friendsBoughtList.length > 0" class="tooltip-wrapper icon-friends-bought">
        <span class="tooltip-trigger" style="color: #4CAF50; display: inline-flex; align-items: center; justify-content: center; transform: translateY(1px);">
          <SvgIcon name="group" size="1.4em" />
        </span>
        <div class="tooltip-card">
          <div class="tooltip-title">✅ 已購票的好友</div>
          <div class="tooltip-section">{{ friendsBoughtList.join('、') }}</div>
        </div>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { TEAMS } from '../data/defaultTeams.js';
import { getRestSeatDisplay, isRestSeatGame } from '../utils/restSeat.js';
import { getFriendsBoughtList, hasTicketPurchased } from '../utils/groupMarks.js';
import {
  formatWeatherTemperature,
  getGameWeather,
} from '../utils/weather.js';
import SvgIcon from './SvgIcon.vue';

const props = defineProps({
  game: Object,
  mode: String,
  cheerleaderData: Object,
  userMarks: Object,
  groupMarks: Object,
  currentUser: Object,
  ticketRules: Object,
  restSeatData: Object,
  weatherData: Object,
  isAdmin: Boolean,
  isFilterActive: Boolean,
  isMatched: Boolean
});

const homeTeam = computed(() => TEAMS[props.game.homeTeam] || { name: props.game.homeTeam, color: '#999' });
const awayTeam = computed(() => TEAMS[props.game.awayTeam] || { name: props.game.awayTeam, color: '#999' });
const markData = computed(() => props.userMarks?.[props.game.gameId]);
const cheers = computed(() => props.cheerleaderData?.[props.game.gameId]);
const weatherModel = computed(() => getGameWeather(props.game, props.weatherData));
const weatherTemperature = computed(() => formatWeatherTemperature(weatherModel.value?.gamePeriod));

const weatherType = computed(() => {
  const w = weatherModel.value?.gamePeriod?.weather || '';
  if (!w) return null;
  if (w.includes('雷')) return 'thunder';
  if (w.includes('雨') || w.includes('陣雨')) return 'rainy';
  if (w.includes('陰') || w.includes('多雲')) return 'cloudy';
  if (w.includes('晴')) return 'sunny';
  return 'cloudy';
});

const rainProbability = computed(() => weatherModel.value?.gamePeriod?.rainProbability);

const hasCheerData = computed(() => {
  return cheers.value && (cheers.value.homeMembers?.length > 0 || cheers.value.awayMembers?.length > 0);
});

const restSeatDisplay = computed(() => {
  if (!isRestSeatGame(props.game)) return null;

  return getRestSeatDisplay(
    props.game.gameId,
    cheers.value?.homeMembers || [],
    props.restSeatData,
  );
});

const friendsWantList = computed(() => {
  if (!props.groupMarks || Object.keys(props.groupMarks).length === 0) return [];
  const list = [];
  Object.entries(props.groupMarks).forEach(([uid, userData]) => {
    const mark = userData.marks?.[props.game.gameId];
    if (uid !== props.currentUser?.uid && mark?.wantToWatch) list.push(userData.displayName || uid);
  });
  return list;
});

const friendsBoughtList = computed(() => {
  return getFriendsBoughtList(
    props.groupMarks,
    props.game.gameId,
    props.currentUser?.uid,
  );
});
</script>

<style lang="scss" scoped>
/* Allow game-matchup to let tooltips float freely outside without clipping */
.game-matchup {
  overflow: visible;
}

/* Location Weather Tooltip Wrapper */
.game-location-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;

  &.tooltip-wrapper:hover .game-location {
    color: var(--text-primary);
    text-decoration: underline dotted;
  }
}

.game-location {
  cursor: pointer;
}

.rain-badge {
  font-size: 0.6rem;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 800;
  margin-top: 2px;
  white-space: nowrap;
  background: rgba(8, 145, 178, 0.15);
  color: #0891b2;

  &.badge-thunder {
    background: rgba(220, 38, 38, 0.15);
    color: #dc2626;
  }
}

.weather-tooltip-details {
  display: flex;
  gap: 10px;
  justify-content: center;
  white-space: nowrap;
}

.weather-tooltip-warning {
  margin-top: 4px;
  color: var(--accent-coral);
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .weather-tooltip-card {
    display: none;
  }
}
</style>
