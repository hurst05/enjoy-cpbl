<template>
  <div class="modal-overlay">
    <div class="modal-content modal-large">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      <h2 class="modal-title">⭐ 我的標記清單 ({{ currentYear }})</h2>

      <div class="marks-summary">
        <span class="mark-want">❤️ 想看: {{ wantCount }} 場</span>
        <span class="mark-ticket">✅ 已買票: {{ ticketCount }} 場</span>
      </div>

      <div class="marks-actions" v-if="sortedGames.length > 0">
        <label class="select-all-label">
          <input type="checkbox" @change="toggleAll" :checked="isAllSelected" /> 全選
        </label>
        <button class="btn-export" @click="exportToICS" :disabled="selectedGames.length === 0">
          匯出所選至日曆 (.ics)
        </button>
      </div>

      <div class="marks-list-container">
        <table class="marks-table" v-if="sortedGames.length > 0">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center; white-space: nowrap;">匯出</th>
              <th>日期</th>
              <th>對戰</th>
              <th>場地</th>
              <th style="white-space: nowrap;">標記</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="game in sortedGames" 
              :key="game.gameId"
              class="mark-row"
              :class="{ 'game-past': isPastGame(game) }"
            >
              <td style="text-align: center;">
                <input type="checkbox" v-model="selectedGames" :value="game.gameId" />
              </td>
              <td>{{ formatDate(game.date) }} ({{ getDowName(game.date) }})</td>
              <td>{{ getTeamName(game.awayTeam) }} vs {{ getTeamName(game.homeTeam) }}</td>
              <td>{{ game.location }}</td>
              <td>
                <span v-if="userMarks[game.gameId]?.wantToWatch" title="想看">❤️</span>
                <span v-if="userMarks[game.gameId]?.ticketPurchased" title="已買票">✅</span>
                <a :href="getGoogleCalendarUrl(game)" target="_blank" rel="noopener noreferrer" style="margin-left: 12px; color: #4285F4; display: inline-block; vertical-align: middle; transition: transform 0.2s, filter 0.2s;" title="加入 Google 日曆" onmouseover="this.style.filter='brightness(0.8)'; this.style.transform='scale(1.1)';" onmouseout="this.style.filter='brightness(1)'; this.style.transform='scale(1)';">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/>
                  </svg>
                </a>
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
import { computed, ref, watch } from 'vue';
import { TEAMS } from '../data/defaultTeams.js';

const props = defineProps({
  scheduleData: Object,
  userMarks: Object,
  cheerleaderData: Object,
  groupMarks: Object
});

const emit = defineEmits(['close']);

const currentYear = new Date().getFullYear();
const selectedGames = ref([]);

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

const isAllSelected = computed(() => {
  return sortedGames.value.length > 0 && selectedGames.value.length === sortedGames.value.length;
});

watch(
  () => sortedGames.value,
  (newGames) => {
    // 當有賽事資料且尚未選擇任何賽事時，預設選取未來且「已買票」的場次
    if (newGames.length > 0 && selectedGames.value.length === 0) {
      selectedGames.value = newGames
        .filter(g => props.userMarks[g.gameId]?.ticketPurchased && !isPastGame(g))
        .map(g => g.gameId);
    }
  },
  { immediate: true }
);

function toggleAll(e) {
  if (e.target.checked) {
    selectedGames.value = sortedGames.value.map(g => g.gameId);
  } else {
    selectedGames.value = [];
  }
}

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

function getGoogleCalendarUrl(game) {
  const awayName = TEAMS[game.awayTeam]?.name || game.awayTeam;
  const homeName = TEAMS[game.homeTeam]?.name || game.homeTeam;
  const title = `[中華職棒] ${awayName} vs ${homeName}`;
  const location = game.location || '';
  
  const time = (game.time && game.time !== 'TBD') ? game.time : '17:05';
  const dStart = new Date(`${game.date}T${time}:00+08:00`);
  const dEnd = new Date(dStart.getTime() + 4 * 60 * 60 * 1000);

  const formatUrlTime = (d) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const dates = `${formatUrlTime(dStart)}/${formatUrlTime(dEnd)}`;
  
  let details = `中華職棒例行賽：${awayName} vs ${homeName}\n`;
  if (game.gameNumber) details += `場次：${game.gameNumber}\n`;
  if (game.themeDay) details += `主題日：${game.themeDay}\n`;

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.append('action', 'TEMPLATE');
  url.searchParams.append('text', title);
  url.searchParams.append('dates', dates);
  url.searchParams.append('details', details);
  url.searchParams.append('location', location);
  
  return url.toString();
}

function formatICSTime(dateStr, timeStr, addHours = 0) {
  const time = (timeStr && timeStr !== 'TBD') ? timeStr : '17:05';
  const d = new Date(`${dateStr}T${time}:00+08:00`);
  if (addHours) {
    d.setHours(d.getHours() + addHours);
  }
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function exportToICS() {
  const selected = sortedGames.value.filter(g => selectedGames.value.includes(g.gameId));
  if (selected.length === 0) return;

  let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Enjoy CPBL//EN\r\n";
  
  selected.forEach(game => {
    const title = `[中華職棒] ${getTeamName(game.awayTeam)} vs ${getTeamName(game.homeTeam)}`;
    const location = game.location || '';
    const dtstart = formatICSTime(game.date, game.time);
    const dtend = formatICSTime(game.date, game.time, 4); // 預設比賽長度抓 4 小時
    const uid = `${game.gameId}@enjoy-cpbl.local`;
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    
    icsContent += "BEGIN:VEVENT\r\n";
    icsContent += `UID:${uid}\r\n`;
    icsContent += `DTSTAMP:${now}\r\n`;
    icsContent += `DTSTART:${dtstart}\r\n`;
    icsContent += `DTEND:${dtend}\r\n`;
    icsContent += `SUMMARY:${title}\r\n`;
    icsContent += `LOCATION:${location}\r\n`;
    icsContent += "END:VEVENT\r\n";
  });
  
  icsContent += "END:VCALENDAR\r\n";
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'cpbl-schedule.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  margin-bottom: 10px;
  font-weight: bold;
}

.marks-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background: var(--bg-hover, #f5f5f5);
  border-radius: 8px;
}

.select-all-label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
}

.btn-export {
  background-color: var(--accent-coral, #ff7043);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-export:hover:not(:disabled) {
  opacity: 0.8;
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
  opacity: 0.55;
  background-color: var(--bg-card);
}

.game-past:hover {
  opacity: 0.8;
  background-color: var(--bg-hover, #f5f5f5);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #888;
  font-size: 1.1em;
}
</style>

