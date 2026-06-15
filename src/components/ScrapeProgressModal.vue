<template>
  <div class="modal-overlay">
    <div class="modal-content" style="position: relative;">
      <!-- Close Button -->
      <button class="modal-close" @click="handleCloseClick" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--text-color);">&times;</button>
      
      <div id="modal-body">
        <div class="modal-section-title" style="text-align: center; font-size: 1.5em; margin-bottom: 20px; padding-top: 10px;">
          💃 啦啦隊班表更新進度
        </div>
        
        <div class="progress-container">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
          <div class="progress-text">
            {{ current }} / {{ total }} ({{ progressPercentage }}%)
          </div>
        </div>

        <div v-if="currentGame" class="current-game-info" style="margin-top: 20px; text-align: center;">
          <p style="font-weight: bold; color: var(--text-color); margin-bottom: 8px;">
            正在爬取：{{ currentGame.date }}
          </p>
          <div class="modal-matchup" style="justify-content: center;">
            <div class="modal-team">
              <span :style="{ color: awayTeam.color || '#999', fontWeight: 'bold' }">{{ awayTeam.name || currentGame.awayTeam }}</span>
              <span class="modal-team-label" style="font-size: 0.8em; color: #666;">客隊</span>
            </div>
            <div class="modal-vs" style="margin: 0 15px;">VS</div>
            <div class="modal-team">
              <span :style="{ color: homeTeam.color || '#999', fontWeight: 'bold' }">{{ homeTeam.name || currentGame.homeTeam }}</span>
              <span class="modal-team-label" style="font-size: 0.8em; color: #666;">主場</span>
            </div>
          </div>
        </div>
        
        <div v-else class="current-game-info" style="margin-top: 20px; text-align: center; color: #666;">
          <p>{{ statusMessage }}</p>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
          <button class="btn-auth btn-full" @click="handleStart" :disabled="isStarted" style="background-color: #3b82f6; color: white; flex: 1;">
            開始更新
          </button>
          <button class="btn-auth btn-full" @click="handleCancel" :disabled="!isStarted || isCancelling" style="background-color: #e53e3e; color: white; flex: 1;">
            {{ isCancelling ? '正在停止...' : '停止更新' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { TEAMS } from '../data/defaultTeams.js';

const props = defineProps({
  current: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currentGame: { type: Object, default: null },
  isStarted: { type: Boolean, default: false },
  isCancelling: { type: Boolean, default: false },
  isDone: { type: Boolean, default: false },
  statusMessage: { type: String, default: '準備中...' }
});

const emit = defineEmits(['start', 'cancel', 'close']);

const progressPercentage = computed(() => {
  if (props.total === 0) return 0;
  return Math.round((props.current / props.total) * 100);
});

const homeTeam = computed(() => props.currentGame ? TEAMS[props.currentGame.homeTeam] || {} : {});
const awayTeam = computed(() => props.currentGame ? TEAMS[props.currentGame.awayTeam] || {} : {});

function handleStart() {
  if (!props.isStarted) {
    emit('start');
  }
}

function handleCancel() {
  if (props.isStarted && !props.isCancelling && !props.isDone) {
    emit('cancel');
  }
}

function handleCloseClick() {
  emit('close');
}
</script>

<style scoped>
.progress-container {
  margin: 10px 0;
}

.progress-bar-bg {
  width: 100%;
  height: 20px;
  background-color: var(--bg-hover);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #3b82f6);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.btn-auth:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-close:hover {
  color: #e53e3e;
}
</style>
