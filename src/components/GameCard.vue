<template>
  <div 
    class="game-card" 
    :class="{ 'game-card-list': mode === 'list', 'game-postponed': game.status === 'postponed' }"
    :style="{ 
      border: `2px solid ${homeTeam.color}`,
      backgroundColor: `color-mix(in srgb, ${homeTeam.color} 15%, var(--bg-card))`
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
      <span class="tooltip-wrapper icon-cheer">
        <span class="tooltip-trigger">💃</span>
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

const props = defineProps({
  game: Object,
  mode: String,
  cheerleaderData: Object,
  userMarks: Object,
  groupMarks: Object,
  ticketRules: Object,
  isAdmin: Boolean
});

const homeTeam = computed(() => TEAMS[props.game.homeTeam] || { name: props.game.homeTeam, color: '#999' });
const awayTeam = computed(() => TEAMS[props.game.awayTeam] || { name: props.game.awayTeam, color: '#999' });
const markData = computed(() => props.userMarks?.[props.game.gameId]);

const cheerTooltipHtml = computed(() => {
  const cheers = props.cheerleaderData?.[props.game.gameId];
  if (!cheers) return '<div class="tooltip-empty">尚無班表資料</div>';

  let html = `<div class="tooltip-title">💃 啦啦隊應援</div>`;
  if (cheers.homeMembers?.length) {
    html += `<div class="tooltip-section">
      <div class="tooltip-team" style="color:${homeTeam.value.color}">${homeTeam.value.cheerName || homeTeam.value.name || '主場'}</div>
      <div class="tooltip-members">${cheers.homeMembers.join('、')}</div>
    </div>`;
  }
  if (cheers.awayMembers?.length) {
    html += `<div class="tooltip-section">
      <div class="tooltip-team" style="color:${awayTeam.value.color}">${awayTeam.value.cheerName || awayTeam.value.name || '客場'}</div>
      <div class="tooltip-members">${cheers.awayMembers.join('、')}</div>
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
