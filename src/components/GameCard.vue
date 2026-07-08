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
        <span class="game-location" v-if="game.location">{{ game.location }}</span>
      </div>
      
      <img v-if="homeTeam.logo" :src="homeTeam.logo" class="team-logo" :alt="homeTeam.name" :title="homeTeam.name" />
      <span v-else class="team-name-short" :style="{ color: homeTeam.color }">{{ homeTeam.short || homeTeam.name }}</span>
    </div>

    <div v-if="game.themeDay" class="game-theme-day">🎉 {{ game.themeDay }}</div>

    <div class="game-icons">
      <!-- Cheerleader -->
      <span v-if="hasCheerData" class="tooltip-wrapper icon-cheer hide-on-mobile">
        <span class="tooltip-trigger" style="display: inline-flex; align-items: center; justify-content: center; color: var(--accent-coral);">
          <svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="currentColor">
            <path d="M 6.5 7.5 Q 4 4, 1 3 Q 3 6, 5 8.5 Q 2 8, 0 9.5 Q 2.5 10.5, 5.5 11 Q 2 12, 1 15 Q 4 13.5, 7 12 Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M 17.5 7.5 Q 20 4, 23 3 Q 21 6, 19 8.5 Q 22 8, 24 9.5 Q 21.5 10.5, 18.5 11 Q 22 12, 23 15 Q 20 13.5, 17 12 Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M 12 17.5 C 12 17.5, 6 13, 6 8.5 C 6 6, 7.5 4.5, 9.5 4.5 C 10.8 4.5, 11.6 5.2, 12 6 C 12.4 5.2, 13.2 4.5, 14.5 4.5 C 16.5 4.5, 18 6, 18 8.5 C 18 13, 12 17.5, 12 17.5 Z" fill="var(--card-bg)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
          </svg>
        </span>
        <div class="tooltip-card" v-html="cheerTooltipHtml"></div>
      </span>

      <!-- User Marks -->
      <span v-if="markData?.wantToWatch" class="game-mark-icon mark-want" title="想看">❤️</span>
      <span v-if="markData?.ticketPurchased" class="game-mark-icon mark-ticket" title="已購票">✅</span>

      <!-- Friends Want -->
      <span v-if="friendsWantList.length > 0" class="tooltip-wrapper icon-friends-want">
        <span class="tooltip-trigger" style="color: #f44336; display: inline-flex; align-items: center; justify-content: center; transform: translateY(1px);">
          <svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
        </span>
        <div class="tooltip-card">
          <div class="tooltip-title">❤️ 想看的好友</div>
          <div class="tooltip-section">{{ friendsWantList.join('、') }}</div>
        </div>
      </span>

      <!-- Friends Bought -->
      <span v-if="friendsBoughtList.length > 0" class="tooltip-wrapper icon-friends-bought">
        <span class="tooltip-trigger" style="color: #4CAF50; display: inline-flex; align-items: center; justify-content: center; transform: translateY(1px);">
          <svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
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

const props = defineProps({
  game: Object,
  mode: String,
  cheerleaderData: Object,
  userMarks: Object,
  groupMarks: Object,
  ticketRules: Object,
  restSeatData: Object,
  isAdmin: Boolean,
  isFilterActive: Boolean,
  isMatched: Boolean
});

const homeTeam = computed(() => TEAMS[props.game.homeTeam] || { name: props.game.homeTeam, color: '#999' });
const awayTeam = computed(() => TEAMS[props.game.awayTeam] || { name: props.game.awayTeam, color: '#999' });
const markData = computed(() => props.userMarks?.[props.game.gameId]);
const cheers = computed(() => props.cheerleaderData?.[props.game.gameId]);

const hasCheerData = computed(() => {
  return cheers.value && (cheers.value.homeMembers?.length > 0 || cheers.value.awayMembers?.length > 0);
});

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const restSeatDisplay = computed(() => {
  if (!isRestSeatGame(props.game)) return null;

  return getRestSeatDisplay(
    props.game.gameId,
    cheers.value?.homeMembers || [],
    props.restSeatData,
  );
});

const cheerTooltipHtml = computed(() => {
  if (!cheers.value) return '<div class="tooltip-empty">尚無班表資料</div>';

  let html = `<div class="tooltip-title">
      <svg viewBox="0 0 24 24" width="1.3em" height="1.3em" fill="var(--accent-coral)" color="var(--accent-coral)" style="display: inline-flex; align-items: center; justify-content: center; vertical-align: text-bottom; margin-right: 4px;">
        <path d="M 6.5 7.5 Q 4 4, 1 3 Q 3 6, 5 8.5 Q 2 8, 0 9.5 Q 2.5 10.5, 5.5 11 Q 2 12, 1 15 Q 4 13.5, 7 12 Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
        <path d="M 17.5 7.5 Q 20 4, 23 3 Q 21 6, 19 8.5 Q 22 8, 24 9.5 Q 21.5 10.5, 18.5 11 Q 22 12, 23 15 Q 20 13.5, 17 12 Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
        <path d="M 12 17.5 C 12 17.5, 6 13, 6 8.5 C 6 6, 7.5 4.5, 9.5 4.5 C 10.8 4.5, 11.6 5.2, 12 6 C 12.4 5.2, 13.2 4.5, 14.5 4.5 C 16.5 4.5, 18 6, 18 8.5 C 18 13, 12 17.5, 12 17.5 Z" fill="var(--bg-card)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
      </svg>
      啦啦隊應援
      ${cheers.value.isFallback ? '<span style="font-size: 0.8em; color: var(--text-secondary); margin-left: 4px; font-weight: normal;">(顯示原訂日期班表)</span>' : ''}
    </div>`;
  if (cheers.value.homeMembers?.length) {
    html += `<div class="tooltip-section">
      <div class="tooltip-team" style="color:${escapeHtml(homeTeam.value.color)}">${escapeHtml(homeTeam.value.cheerName || homeTeam.value.name || '主場')}</div>
      <div class="tooltip-members">${cheers.value.homeMembers.map(escapeHtml).join('、')}</div>
    </div>`;
  }
  if (cheers.value.awayMembers?.length) {
    html += `<div class="tooltip-section">
      <div class="tooltip-team" style="color:${escapeHtml(awayTeam.value.color)}">${escapeHtml(awayTeam.value.cheerName || awayTeam.value.name || '客場')}</div>
      <div class="tooltip-members">${cheers.value.awayMembers.map(escapeHtml).join('、')}</div>
    </div>`;
  }
  if (restSeatDisplay.value) {
    html += `<div class="tooltip-section">
      <div class="tooltip-team"> ${escapeHtml(restSeatDisplay.value.label)}</div>
      <div class="tooltip-members">${restSeatDisplay.value.members.length ? restSeatDisplay.value.members.map(escapeHtml).join('、') : '尚無可顯示名單'}</div>
    </div>`;
  }
  return html;
});



const friendsWantList = computed(() => {
  if (!props.groupMarks || Object.keys(props.groupMarks).length === 0) return [];
  const list = [];
  Object.entries(props.groupMarks).forEach(([uid, userData]) => {
    const mark = userData.marks?.[props.game.gameId];
    if (mark?.wantToWatch) list.push(userData.displayName || uid);
  });
  return list;
});

const friendsBoughtList = computed(() => {
  if (!props.groupMarks || Object.keys(props.groupMarks).length === 0) return [];
  const list = [];
  Object.entries(props.groupMarks).forEach(([uid, userData]) => {
    const mark = userData.marks?.[props.game.gameId];
    if (mark?.ticketPurchased) list.push(userData.displayName || uid);
  });
  return list;
});
</script>
