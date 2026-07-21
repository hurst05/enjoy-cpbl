<template>
  <div class="modal-overlay" @click.self="handleOverlayClick">
    <div class="modal-content modal-large">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      <h2 class="modal-title">⭐ 我的標記清單 ({{ currentYear }})</h2>

      <div class="marks-summary">
        <span class="mark-want">❤️ 想看: {{ wantCount }} 場</span>
        <span class="mark-ticket">✅ 已買票: {{ ticketCount }} 場</span>
      </div>

      <div class="marks-actions">
        <div class="marks-filters">
          <select v-model="filterStage1" class="filter-select">
            <option value="self">自己</option>
            <option v-if="hasGroups" value="group">群組</option>
          </select>
          <select v-if="filterStage1 === 'group'" v-model="filterStage2" class="filter-select">
            <option value="all">群組所有</option>
            <option value="self">自己</option>
            <option v-for="(data, uid) in groupMarks" :key="uid" :value="uid">{{ data.displayName }}</option>
          </select>
        </div>

        <div class="marks-actions-right" v-if="sortedGames.length > 0">
          <label class="select-all-label">
            <input type="checkbox" @change="toggleAll" :checked="isAllSelected" /> 全選
          </label>
          <button class="btn-export btn-csv" @click="exportToCSV" :disabled="selectedGames.length === 0">
            匯出至 Excel (.csv)
          </button>
          <button class="btn-export" @click="exportToICS" :disabled="selectedGames.length === 0">
            匯出至日曆 (.ics)
          </button>
        </div>
      </div>

      <div class="marks-list-container">
        <!-- Desktop Table View -->
        <table class="marks-table hide-on-mobile" v-if="sortedGames.length > 0">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center; white-space: nowrap;">匯出</th>
              <th>日期</th>
              <th>對戰</th>
              <th>場地</th>
              <th v-if="filterStage1 === 'group'">群友</th>
              <th style="white-space: nowrap;">標記</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="item in sortedGames" 
              :key="item.game.gameId"
              class="mark-row"
              :class="{ 'game-past': isPastGame(item.game) }"
            >
              <td style="text-align: center;">
                <input type="checkbox" v-model="selectedGames" :value="item.game.gameId" />
              </td>
              <td>{{ formatDate(item.game.date) }} ({{ getDowName(item.game.date) }})</td>
              <td>{{ getTeamName(item.game.awayTeam) }} vs {{ getTeamName(item.game.homeTeam) }}</td>
              <td>{{ item.game.location }}</td>
              <td v-if="filterStage1 === 'group'" class="group-members-col">
                {{ item.members.map(m => m.name).join(', ') }}
              </td>
              <td>
                <span v-if="item.highestWeight === 1" title="想看">❤️</span>
                <span v-if="item.highestWeight === 2" title="已買票">✅</span>
                <a :href="getGoogleCalendarUrl(item.game)" target="_blank" rel="noopener noreferrer" style="margin-left: 12px; color: #4285F4; display: inline-block; vertical-align: middle; transition: transform 0.2s, filter 0.2s;" title="加入 Google 日曆" onmouseover="this.style.filter='brightness(0.8)'; this.style.transform='scale(1.1)';" onmouseout="this.style.filter='brightness(1)'; this.style.transform='scale(1)';">
                  <SvgIcon name="calendar" size="20px" />
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Mobile Card View -->
        <div class="marks-list-mobile hide-on-desktop" v-if="sortedGames.length > 0">
          <div 
            v-for="item in sortedGames" 
            :key="item.game.gameId"
            class="mark-card"
            :class="{ 'game-past': isPastGame(item.game) }"
          >
            <div class="mark-card-header">
              <label class="export-checkbox">
                <input type="checkbox" v-model="selectedGames" :value="item.game.gameId" /> 選擇匯出
              </label>
              <div class="mark-status">
                <span v-if="item.highestWeight === 1" title="想看">❤️ 想看</span>
                <span v-if="item.highestWeight === 2" title="已買票">✅ 已買票</span>
                <a :href="getGoogleCalendarUrl(item.game)" target="_blank" rel="noopener noreferrer" class="gcal-btn">📅 加日曆</a>
              </div>
            </div>
            <div class="mark-card-body">
              <div class="mark-date">{{ formatDate(item.game.date) }} ({{ getDowName(item.game.date) }}) - {{ item.game.location }}</div>
              <div class="mark-teams">{{ getTeamName(item.game.awayTeam) }} vs {{ getTeamName(item.game.homeTeam) }}</div>
              <div class="mark-members" v-if="filterStage1 === 'group'">
                群友: {{ item.members.map(m => m.name).join(', ') }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="sortedGames.length === 0" class="empty-state">
          今年尚未標記任何賽事
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { TEAMS } from '../data/defaultTeams.js';
import { hasTicketPurchased } from '../utils/groupMarks.js';
import SvgIcon from './SvgIcon.vue';

const props = defineProps({
  scheduleData: Object,
  userMarks: Object,
  cheerleaderData: Object,
  groupMarks: Object,
  userProfile: Object
});

const emit = defineEmits(['close', 'load-group-data']);

const handleOverlayClick = () => {
  if (window.innerWidth <= 768) {
    emit('close');
  }
};

const currentYear = new Date().getFullYear();
const selectedGames = ref([]);

const hasGroups = computed(() => {
  return props.userProfile?.groups && Object.keys(props.userProfile.groups).length > 0;
});

const filterStage1 = ref('self');
const filterStage2 = ref('all');

watch(filterStage1, (newVal) => {
  if (newVal === 'group' && (!props.groupMarks || Object.keys(props.groupMarks).length === 0)) {
    if (props.userProfile?.groups) {
      emit('load-group-data', props.userProfile.groups);
    }
  }
});

const aggregatedMarks = computed(() => {
  const result = {}; 
  if (!props.scheduleData) return [];

  const addMark = (uid, name, marksObj) => {
    for (const gameId in marksObj) {
      const m = marksObj[gameId];
      const ticketPurchased = hasTicketPurchased(m);
      if (m.wantToWatch || ticketPurchased) {
        const game = props.scheduleData[gameId];
        if (game && game.date && game.date.startsWith(currentYear.toString())) {
          if (!result[gameId]) {
            result[gameId] = { game, members: [], highestWeight: 0 };
          }
          result[gameId].members.push({ uid, name, wantToWatch: m.wantToWatch, ticketPurchased });
          const weight = ticketPurchased ? 2 : (m.wantToWatch ? 1 : 0);
          if (weight > result[gameId].highestWeight) {
            result[gameId].highestWeight = weight;
          }
        }
      }
    }
  };

  if (filterStage1.value === 'self') {
    addMark('self', '自己', props.userMarks || {});
  } else {
    if (filterStage2.value === 'all') {
      addMark('self', '自己', props.userMarks || {});
      if (props.groupMarks) {
        for (const uid in props.groupMarks) {
          addMark(uid, props.groupMarks[uid].displayName, props.groupMarks[uid].marks || {});
        }
      }
    } else if (filterStage2.value === 'self') {
      addMark('self', '自己', props.userMarks || {});
    } else {
      const uid = filterStage2.value;
      if (props.groupMarks && props.groupMarks[uid]) {
        addMark(uid, props.groupMarks[uid].displayName, props.groupMarks[uid].marks || {});
      }
    }
  }
  return Object.values(result);
});

const sortedGames = computed(() => {
  return [...aggregatedMarks.value].sort((a, b) => {
    return a.game.date.localeCompare(b.game.date) || a.game.time.localeCompare(b.game.time);
  });
});

const wantCount = computed(() => {
  return sortedGames.value.filter(item => item.highestWeight === 1).length;
});

const ticketCount = computed(() => {
  return sortedGames.value.filter(item => item.highestWeight === 2).length;
});

const isAllSelected = computed(() => {
  return sortedGames.value.length > 0 && selectedGames.value.length === sortedGames.value.length;
});

watch(
  () => sortedGames.value,
  (newGames) => {
    selectedGames.value = newGames
      .filter(item => item.highestWeight === 2 && !isPastGame(item.game))
      .map(item => item.game.gameId);
  },
  { immediate: true }
);

function toggleAll(e) {
  if (e.target.checked) {
    selectedGames.value = sortedGames.value.map(item => item.game.gameId);
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
  const selected = sortedGames.value.filter(g => selectedGames.value.includes(g.game.gameId));
  if (selected.length === 0) return;

  let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Enjoy CPBL//EN\r\n";
  
  selected.forEach(item => {
    const game = item.game;
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

function exportToCSV() {
  const selected = sortedGames.value.filter(g => selectedGames.value.includes(g.game.gameId));
  if (selected.length === 0) return;

  // Add BOM for Excel UTF-8 compatibility
  let csvContent = '\uFEFF';
  csvContent += '日期,時間,客隊,主隊,場地,個人標記,群友標記\n';

  selected.forEach(item => {
    const game = item.game;
    const gameId = game.gameId;
    const date = `${game.date} (${getDowName(game.date)})`;
    const time = game.time || 'TBD';
    const away = getTeamName(game.awayTeam);
    const home = getTeamName(game.homeTeam);
    const location = game.location || '';
    
    let markStr = '';
    if (props.userMarks && props.userMarks[gameId]) {
      if (hasTicketPurchased(props.userMarks[gameId])) markStr = '✅已買票';
      else if (props.userMarks[gameId].wantToWatch) markStr = '❤️想看';
    }
    
    const allMembers = [];
    if (props.userMarks && props.userMarks[gameId]) {
      const m = props.userMarks[gameId];
      const ticketPurchased = hasTicketPurchased(m);
      if (m.wantToWatch || ticketPurchased) {
        allMembers.push(`自己(${ticketPurchased ? '✅' : '❤️'})`);
      }
    }
    
    if (props.groupMarks) {
      for (const uid in props.groupMarks) {
        const gm = props.groupMarks[uid].marks && props.groupMarks[uid].marks[gameId];
        const ticketPurchased = hasTicketPurchased(gm);
        if (gm && (gm.wantToWatch || ticketPurchased)) {
          allMembers.push(`${props.groupMarks[uid].displayName}(${ticketPurchased ? '✅' : '❤️'})`);
        }
      }
    }

    const membersStr = allMembers.join(' / ');

    const row = [
      `"${date}"`,
      `"${time}"`,
      `"${away}"`,
      `"${home}"`,
      `"${location}"`,
      `"${markStr}"`,
      `"${membersStr}"`
    ].join(',');
    
    csvContent += row + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'cpbl-marks.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<style scoped>
.modal-large {
  max-width: 1200px;
  width: 60%;
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

.btn-csv {
  background-color: #4CAF50;
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

.marks-filters {
  display: flex;
  gap: 10px;
}

.filter-select {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #ccc);
  background: var(--bg-card, #fff);
  color: var(--text-color, #333);
  font-size: 0.95em;
}

.marks-actions-right {
  display: flex;
  gap: 15px;
  align-items: center;
}

.marks-list-mobile {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mark-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #eee);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.mark-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-color, #eee);
  padding-bottom: 8px;
}

.export-checkbox {
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mark-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gcal-btn {
  color: #4285F4;
  text-decoration: none;
  font-size: 0.9em;
  font-weight: bold;
}

.mark-card-body {
  font-size: 0.95em;
  line-height: 1.5;
}

.mark-date {
  font-weight: bold;
  margin-bottom: 4px;
}

.mark-members {
  margin-top: 6px;
  color: var(--text-color-light, #666);
  font-size: 0.85em;
  background: var(--bg-hover, #f5f5f5);
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.hide-on-mobile {
  display: table;
}
.hide-on-desktop {
  display: none;
}

@media (max-width: 768px) {
  .marks-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .marks-filters {
    width: 100%;
  }
  .marks-filters .filter-select {
    flex: 1;
  }
  .marks-actions-right {
    width: 100%;
    justify-content: space-between;
  }
  .hide-on-mobile {
    display: none !important;
  }
  .hide-on-desktop {
    display: flex !important;
  }
  .modal-large {
    width: 90%;
    max-width: 600px;
  }
}
</style>

