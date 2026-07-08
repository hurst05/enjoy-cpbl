<template>
  <div class="modal-overlay" @click.self="handleOverlayClick">
    <div class="modal-content rest-seat-modal-content">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">×</button>
      <h3>🪑 歇歇席管理</h3>

      <div v-if="restSeatGames.length === 0" class="empty-hint">
        目前沒有符合「統一獅、亞太主、週三」原始場次的比賽。
      </div>

      <template v-else>
        <div class="rest-seat-field">
          <label>歇歇席場次</label>
          <select v-model="selectedGameId" class="form-input">
            <option v-for="game in restSeatGames" :key="game.gameId" :value="game.gameId">
              {{ formatGameLabel(game) }}
            </option>
          </select>
        </div>

        <div v-if="selectedGame" class="rest-seat-summary">
          <div class="summary-line">
            <strong>{{ selectedGame.date }}</strong>
            <span>{{ selectedGame.dayOfWeek }}</span>
            <span>{{ selectedGame.location }}</span>
          </div>
          <div v-if="selectedGame.originalDate || selectedGame.originalLocation" class="summary-muted">
            原始場次：{{ restSeatBasis.date }} {{ restSeatBasis.dayOfWeek }} @{{ restSeatBasis.location }}
          </div>
          <div class="summary-muted">
            {{ savedMembers.length ? `已維護：${savedMembers.join('、')}` : '尚未維護歇歇席人員' }}
          </div>
        </div>

        <div class="rest-seat-toolbar">
          <button class="btn-auth btn-ghost" type="button" :disabled="eligibleMembers.length === 0" @click="pickRandomMembers">
            隨機挑 2 位
          </button>
          <span class="summary-muted">已選 {{ selectedMembers.length }} / {{ requiredCount }}</span>
        </div>

        <div v-if="homeMembers.length > 0" class="rest-seat-member-list">
          <label
            v-for="member in homeMembers"
            :key="member"
            class="rest-seat-member"
            :class="{ disabled: !isSelectable(member) }"
          >
            <input
              type="checkbox"
              :value="member"
              :checked="selectedMembers.includes(member)"
              :disabled="!isSelectable(member)"
              @change="toggleMember(member, $event.target.checked)"
            />
            <span>{{ member }}</span>
            <span v-if="!isSelectable(member)" class="member-note">已出席過</span>
          </label>
        </div>
        <div v-else class="empty-hint">這場目前沒有主場啦啦隊班表。</div>

        <div v-if="eligibleMembers.length > 0" class="summary-muted">
          可選名單：{{ eligibleMembers.join('、') }}
        </div>

        <div class="modal-actions">
          <button class="btn-primary" :disabled="!canSave || saving" @click="save">
            {{ saving ? '儲存中...' : '儲存歇歇席' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { saveRestSeat } from '../firebase.js';
import { TEAMS } from '../data/defaultTeams.js';
import {
  REST_SEAT_REQUIRED_COUNT,
  getRestSeatEligibleMembers,
  getRestSeatGameBasis,
  isRestSeatGame,
  normalizeMemberList,
} from '../utils/restSeat.js';

const props = defineProps({
  scheduleData: Object,
  cheerleaderData: Object,
  restSeatData: Object,
});

const emit = defineEmits(['close', 'saved']);

const selectedGameId = ref('');
const selectedMembers = ref([]);
const saving = ref(false);

const requiredCount = REST_SEAT_REQUIRED_COUNT;

const handleOverlayClick = () => {
  if (window.innerWidth <= 768) {
    emit('close');
  }
};

const restSeatGames = computed(() => {
  return Object.values(props.scheduleData || {})
    .filter(isRestSeatGame)
    .sort((a, b) => {
      if (a.date === b.date) return Number(a.gameNumber || 0) - Number(b.gameNumber || 0);
      return new Date(a.date) - new Date(b.date);
    });
});

const selectedGame = computed(() => {
  return restSeatGames.value.find(game => game.gameId === selectedGameId.value) || null;
});

const restSeatBasis = computed(() => getRestSeatGameBasis(selectedGame.value));

const savedMembers = computed(() => normalizeMemberList(props.restSeatData?.[selectedGameId.value]?.members));

const homeMembers = computed(() => normalizeMemberList(props.cheerleaderData?.[selectedGameId.value]?.homeMembers));

const eligibleMembers = computed(() => {
  return getRestSeatEligibleMembers(homeMembers.value, props.restSeatData, requiredCount, selectedGameId.value);
});

const canSave = computed(() => {
  const targetCount = Math.min(requiredCount, homeMembers.value.length);
  return targetCount > 0 && selectedMembers.value.length === targetCount;
});

watch(
  restSeatGames,
  (games) => {
    if (!selectedGameId.value && games.length > 0) {
      selectedGameId.value = games[0].gameId;
    }
  },
  { immediate: true },
);

watch(
  selectedGameId,
  () => {
    selectedMembers.value = savedMembers.value.slice(0, requiredCount);
  },
  { immediate: true },
);

function formatGameLabel(game) {
  const awayName = TEAMS[game.awayTeam]?.short || game.awayTeam;
  const homeName = TEAMS[game.homeTeam]?.short || game.homeTeam;
  const gameNo = game.gameNumber ? `G${game.gameNumber}` : game.gameId;

  return `${game.date} ${game.dayOfWeek || ''} ${gameNo} ${awayName} vs ${homeName} @${game.location || '未定'}`;
}

function isSelectable(member) {
  return eligibleMembers.value.includes(member) || selectedMembers.value.includes(member);
}

function toggleMember(member, checked) {
  if (checked) {
    if (selectedMembers.value.length >= requiredCount || !isSelectable(member)) return;
    selectedMembers.value = [...selectedMembers.value, member];
    return;
  }

  selectedMembers.value = selectedMembers.value.filter(name => name !== member);
}

function pickRandomMembers() {
  const pool = eligibleMembers.value.slice();
  const picked = [];

  while (pool.length > 0 && picked.length < requiredCount) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }

  selectedMembers.value = picked;
}

async function save() {
  if (!canSave.value) return;

  saving.value = true;
  try {
    await saveRestSeat(selectedGameId.value, selectedMembers.value);
    emit('saved');
    alert('歇歇席名單已儲存');
  } catch (e) {
    alert('儲存歇歇席失敗：' + e.message);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.rest-seat-modal-content {
  width: 90%;
  max-width: 680px;
}

.rest-seat-field {
  display: grid;
  gap: 6px;
  margin-bottom: 16px;
}

.form-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-color);
}

.rest-seat-summary {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  margin-bottom: 14px;
}

.summary-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.summary-muted {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.rest-seat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.rest-seat-member-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.rest-seat-member {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  background: var(--bg-card);
}

.rest-seat-member.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.member-note {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.empty-hint {
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
