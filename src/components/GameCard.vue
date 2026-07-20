<template>
  <div 
    class="game-card" 
    :class="{ 
      'game-card-list': mode === 'list', 
      'game-postponed': game.status === 'postponed',
      'game-card-filtered-out': isFilterActive && !isMatched,
      'game-card-highlighted': isFilterActive && isMatched,
      'game-card-has-weather': weatherIconUrl
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
        <span class="game-location" v-if="game.location">{{ game.location }}</span>
      </div>
      
      <img v-if="homeTeam.logo" :src="homeTeam.logo" class="team-logo" :alt="homeTeam.name" :title="homeTeam.name" />
      <span v-else class="team-name-short" :style="{ color: homeTeam.color }">{{ homeTeam.short || homeTeam.name }}</span>
    </div>

    <div v-if="game.themeDay" class="game-theme-day">🎉 {{ game.themeDay }}</div>

    <div class="game-icons">
      <!-- Weather -->
      <span
        v-if="weatherIconUrl"
        class="tooltip-wrapper icon-weather"
        :class="`icon-weather-${weatherModel.freshness}`"
      >
        <span
          class="tooltip-trigger weather-icon-trigger"
          :aria-label="`${weatherModel.gamePeriod.weather}，降雨 ${weatherModel.gamePeriod.rainProbability ?? '—'}%，${weatherTemperature}`"
        >
          <img
            :src="weatherIconUrl"
            :alt="weatherModel.gamePeriod.weather"
            class="weather-icon-image"
          />
        </span>
        <div class="tooltip-card weather-tooltip-card">
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
      <span v-if="markData?.ticketPurchased" class="game-mark-icon mark-ticket" title="已購票">✅</span>

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
import { getFriendsBoughtList } from '../utils/groupMarks.js';
import {
  formatWeatherTemperature,
  getGameWeather,
  getWeatherIconUrl,
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
const weatherIconUrl = computed(() => getWeatherIconUrl(weatherModel.value?.gamePeriod));
const weatherTemperature = computed(() => formatWeatherTemperature(weatherModel.value?.gamePeriod));

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
.game-card {
  container: weather-card / inline-size;
}

.icon-weather {
  position: absolute;
  top: 4px;
  left: 2px;
  box-sizing: border-box;
  width: 24px;
  height: 24px;
  padding: 3px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(27, 42, 63, 0.3);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.24);
  z-index: 2;
}

.game-card-has-weather:not(.game-card-list) .game-matchup {
  box-sizing: border-box;
  width: 100%;
  justify-content: center;
  gap: 0;
  overflow: visible;
}

.game-card-has-weather:not(.game-card-list) .game-center-info {
  margin: 0;
}

@container weather-card (max-width: 115px) {
  .game-card-has-weather:not(.game-card-list) .game-matchup {
    padding-left: 18px;
    justify-content: flex-start;
  }
}

.weather-icon-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.weather-icon-image {
  display: block;
  width: 16px;
  height: 16px;
  filter: saturate(1.12) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.45));
}

.icon-weather-stale .weather-icon-image,
.icon-weather-expired .weather-icon-image {
  filter: saturate(0.72) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.45));
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
