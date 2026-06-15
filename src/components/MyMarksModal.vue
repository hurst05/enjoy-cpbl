<template>
  <div class="modal-overlay">
    <div class="modal-content modal-large">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      <h2 class="modal-title">⭐ 我的標記清單 ({{ currentYear }})</h2>

      <div class="marks-summary">
        <span class="mark-want">❤️ 想看: {{ wantCount }} 場</span>
        <span class="mark-ticket">✅ 已買票: {{ ticketCount }} 場</span>
      </div>

      <div class="marks-list-container">
        <table class="marks-table" v-if="sortedGames.length > 0">
          <thead>
            <tr>
              <th>日期</th>
              <th>對戰</th>
              <th>場地</th>
              <th>標記</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="game in sortedGames" 
              :key="game.gameId"
              class="mark-row"
              :class="{ 'game-past': isPastGame(game) }"
            >
              <td>{{ formatDate(game.date) }} ({{ getDowName(game.date) }})</td>
              <td>{{ getTeamName(game.awayTeam) }} vs {{ getTeamName(game.homeTeam) }}</td>
              <td>{{ game.location }}</td>
              <td>
                <span v-if="userMarks[game.gameId]?.wantToWatch" title="想看">❤️</span>
                <span v-if="userMarks[game.gameId]?.ticketPurchased" title="已買票">✅</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          今年尚未標記任何賽事
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { TEAMS } from '../data/defaultTeams.js';

const props = defineProps({
  scheduleData: Object,
  userMarks: Object,
  cheerleaderData: Object,
  groupMarks: Object
});

const emit = defineEmits(['close']);

const currentYear = new Date().getFullYear();

const markedGames = computed(() => {
  const games = [];
  if (!props.scheduleData || !props.userMarks) return games;

  for (const gameId in props.userMarks) {
    const marks = props.userMarks[gameId];
    if (marks.wantToWatch || marks.ticketPurchased) {
      const game = props.scheduleData[gameId];
      // 只顯示今年的比賽
      if (game && game.date && game.date.startsWith(currentYear.toString())) {
        games.push(game);
      }
    }
  }
  return games;
});

const sortedGames = computed(() => {
  return [...markedGames.value].sort((a, b) => {
    return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
  });
});

const wantCount = computed(() => {
  return sortedGames.value.filter(g => props.userMarks[g.gameId]?.wantToWatch).length;
});

const ticketCount = computed(() => {
  return sortedGames.value.filter(g => props.userMarks[g.gameId]?.ticketPurchased).length;
});

function isPastGame(game) {
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  
  if (game.date < todayStr) return true;
  return false;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

function getDowName(dateStr) {
  if (!dateStr) return '';
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const d = new Date(dateStr);
  return days[d.getDay()];
}

function getTeamName(teamId) {
  return TEAMS[teamId]?.short || TEAMS[teamId]?.name || teamId;
}
</script>

<style scoped>
.modal-large {
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.marks-summary {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  font-weight: bold;
}

.marks-list-container {
  overflow-y: auto;
  flex: 1;
}

.marks-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.marks-table th, .marks-table td {
  padding: 10px;
  border-bottom: 1px solid var(--border-color, #eee);
}

.marks-table th {
  font-weight: bold;
  color: var(--text-color, #333);
  background-color: var(--bg-hover, #f9f9f9);
}

.mark-row {
  transition: background-color 0.2s, opacity 0.2s;
}

.mark-row:hover {
  background-color: var(--bg-hover, #f5f5f5);
}

.game-past {
  filter: grayscale(100%);
  opacity: 0.5;
}

.game-past:hover {
  opacity: 0.7;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #888;
  font-size: 1.1em;
}
</style>
