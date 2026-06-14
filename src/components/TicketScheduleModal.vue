<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content ticket-modal-content">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      <h3>🎟️ 售票時程管理</h3>

      <div class="modal-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">
          一般場地 (例行賽)
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'specific' }" @click="activeTab = 'specific'">
          巨蛋 / 特殊場次
        </button>
      </div>

      <div v-if="loading" class="loading-state">載入中...</div>
      
      <div v-else class="tab-content">
        <!-- Tab A: 一般場地 -->
        <div v-if="activeTab === 'general'" class="general-tab">
          <div class="filters">
            <select v-model="selectedHalf" class="form-input" @change="loadGeneralRules">
              <option value="H1">上半季</option>
              <option value="H2">下半季</option>
            </select>
            <select v-model="selectedTeam" class="form-input" @change="loadGeneralRules">
              <option disabled value="">選擇球隊</option>
              <option v-for="(team, id) in TEAMS" :key="id" :value="id">{{ team.name }}</option>
            </select>
          </div>

          <div v-if="selectedTeam && currentRules" class="rules-editor">
            <h4>{{ TEAMS[selectedTeam]?.name }} - {{ selectedHalf === 'H1' ? '上半季' : '下半季' }} 售票時程</h4>
            
            <div v-for="(rule, index) in currentRules" :key="index" class="rule-row">
              <input type="text" v-model="rule.label" placeholder="階段名稱" class="rule-input-label" />
              <input type="date" :value="getDatePart(rule.date)" @input="updateDatePart(rule, $event.target.value)" class="rule-input-date" />
              <select :value="getTimePart(rule.date)" @change="updateTimePart(rule, $event.target.value)" class="rule-input-time">
                <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
              </select>
              <button class="btn-danger-small" @click="removeRule(index)">🗑️</button>
            </div>
            
            <button class="btn-add-rule" @click="addRule">+ 新增階段</button>
            
            <div class="modal-actions">
              <button class="btn-primary" @click="saveGeneralRules" :disabled="saving">
                {{ saving ? '儲存中...' : '儲存一般規則' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Tab B: 巨蛋場次 -->
        <div v-if="activeTab === 'specific'" class="specific-tab">
          <div class="filters">
            <select v-model="selectedSpecificTeam" class="form-input" @change="loadDomeGames">
              <option disabled value="">選擇主場球隊</option>
              <option v-for="(team, id) in TEAMS" :key="id" :value="id">{{ team.name }}</option>
            </select>
          </div>

          <div v-if="selectedSpecificTeam" class="dome-container">
            <div class="dome-games-container">
              <div class="dome-games-header">
                <h4>選擇巨蛋場次 (下半季)</h4>
                <div v-if="domeGames.length === 0" class="empty-hint">無巨蛋主場賽事</div>
                <div v-else class="select-all-wrapper">
                  <label class="game-checkbox-label" style="padding: 0;">
                    <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
                    <span style="font-weight: bold;">全選 / 全不選</span>
                  </label>
                </div>
              </div>
              <div class="dome-games-list" v-if="domeGames.length > 0">
                <label v-for="game in domeGames" :key="game.gameId" class="game-checkbox-label">
                  <input type="checkbox" :value="game.gameId" v-model="selectedGames" />
                  <span>{{ game.date }} ({{ game.gameNumber }}) vs {{ TEAM_NAME_MAP_REVERSE[game.awayTeam] || game.awayTeam }} @{{ game.location }}</span>
                </label>
              </div>
            </div>

            <div class="rules-editor" v-if="selectedGames.length > 0">
              <h4>設定所選場次售票時程</h4>
              <div v-for="(rule, index) in currentSpecificRules" :key="index" class="rule-row">
                <input type="text" v-model="rule.label" placeholder="階段名稱" class="rule-input-label" />
                <input type="date" :value="getDatePart(rule.date)" @input="updateDatePart(rule, $event.target.value)" class="rule-input-date" />
                <select :value="getTimePart(rule.date)" @change="updateTimePart(rule, $event.target.value)" class="rule-input-time">
                  <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
                <button class="btn-danger-small" @click="removeSpecificRule(index)">🗑️</button>
              </div>
              <button class="btn-add-rule" @click="addSpecificRule">+ 新增階段</button>
              
              <div class="modal-actions">
                <button class="btn-primary" @click="saveSpecificRules" :disabled="saving">
                  {{ saving ? '儲存中...' : `儲存至 ${selectedGames.length} 場賽事` }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { getTicketSchedules, saveTicketScheduleGeneral, saveTicketScheduleSpecific, getSchedules } from '../firebase.js';
import { TEAMS } from '../data/defaultTeams.js';

const emit = defineEmits(['close', 'saved']);

// Reverse map for UI display
const TEAM_NAME_MAP_REVERSE = Object.entries(TEAMS).reduce((acc, [key, val]) => {
  acc[key] = val.short || val.name;
  return acc;
}, {});

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const getDatePart = (dateStr) => dateStr ? dateStr.split('T')[0] : '';
const getTimePart = (dateStr) => dateStr ? dateStr.split('T')[1] : '12:00';

const updateDatePart = (rule, val) => {
  const parts = rule.date ? rule.date.split('T') : ['', '12:00'];
  rule.date = `${val}T${parts[1] || '12:00'}`;
};

const updateTimePart = (rule, val) => {
  const parts = rule.date ? rule.date.split('T') : ['', '12:00'];
  rule.date = `${parts[0]}T${val}`;
};

const loading = ref(true);
const saving = ref(false);
const activeTab = ref('general');
const allSchedules = ref({});
const ticketData = ref({});

// Tab A
const selectedHalf = ref('H2');
const selectedTeam = ref('');
const currentRules = ref([]);

// Tab B
const selectedSpecificTeam = ref('');
const domeGames = ref([]);
const selectedGames = ref([]);
const currentSpecificRules = ref([]);

onMounted(async () => {
  try {
    ticketData.value = await getTicketSchedules();
    allSchedules.value = await getSchedules() || {};
  } catch (e) {
    alert('讀取失敗: ' + e.message);
  } finally {
    loading.value = false;
  }
});

// --- Tab A Logic ---
const loadGeneralRules = () => {
  if (!selectedTeam.value) return;
  const existing = ticketData.value?.[2026]?.[selectedHalf.value]?.[selectedTeam.value]?.normal;
  currentRules.value = existing ? JSON.parse(JSON.stringify(existing)) : [{ label: '全面開賣', date: '' }];
};

const addRule = () => currentRules.value.push({ label: '新階段', date: '' });
const removeRule = (idx) => currentRules.value.splice(idx, 1);

const saveGeneralRules = async () => {
  saving.value = true;
  try {
    await saveTicketScheduleGeneral(2026, selectedHalf.value, selectedTeam.value, 'normal', currentRules.value);
    
    // Refresh local cache
    if (!ticketData.value[2026]) ticketData.value[2026] = {};
    if (!ticketData.value[2026][selectedHalf.value]) ticketData.value[2026][selectedHalf.value] = {};
    if (!ticketData.value[2026][selectedHalf.value][selectedTeam.value]) ticketData.value[2026][selectedHalf.value][selectedTeam.value] = {};
    ticketData.value[2026][selectedHalf.value][selectedTeam.value].normal = JSON.parse(JSON.stringify(currentRules.value));
    
    alert('一般規則儲存成功！');
    emit('saved');
  } catch (e) {
    alert('儲存失敗: ' + e.message);
  } finally {
    saving.value = false;
  }
};

// --- Tab B Logic ---
const isAllSelected = computed(() => {
  return domeGames.value.length > 0 && selectedGames.value.length === domeGames.value.length;
});

const toggleSelectAll = (e) => {
  if (e.target.checked) {
    selectedGames.value = domeGames.value.map(g => g.gameId);
  } else {
    selectedGames.value = [];
  }
};

const loadDomeGames = () => {
  selectedGames.value = [];
  currentSpecificRules.value = [{ label: '全面開賣', date: '' }];
  
  if (!selectedSpecificTeam.value) {
    domeGames.value = [];
    return;
  }

  const games = Object.values(allSchedules.value).filter(g => 
    g.homeTeam === selectedSpecificTeam.value && 
    g.gameNumber > 180 && 
    g.location.includes('巨蛋')
  );
  
  // Sort by date
  games.sort((a, b) => new Date(a.date) - new Date(b.date));
  domeGames.value = games;
};

const addSpecificRule = () => currentSpecificRules.value.push({ label: '新階段', date: '' });
const removeSpecificRule = (idx) => currentSpecificRules.value.splice(idx, 1);

const saveSpecificRules = async () => {
  if (selectedGames.value.length === 0) return;
  saving.value = true;
  try {
    const promises = selectedGames.value.map(gameId => 
      saveTicketScheduleSpecific(gameId, currentSpecificRules.value)
    );
    await Promise.all(promises);
    
    // Refresh local cache
    if (!ticketData.value.gameSpecific) ticketData.value.gameSpecific = {};
    for (const gameId of selectedGames.value) {
      ticketData.value.gameSpecific[gameId] = JSON.parse(JSON.stringify(currentSpecificRules.value));
    }

    alert('專屬場次規則儲存成功！');
    selectedGames.value = []; // Clear selection after save
    emit('saved');
  } catch (e) {
    alert('儲存失敗: ' + e.message);
  } finally {
    saving.value = false;
  }
};

</script>

<style scoped>
.ticket-modal-content {
  width: 90%;
  max-width: 600px;
}
.modal-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}
.tab-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  font-weight: bold;
  color: var(--text-color);
  opacity: 0.6;
  cursor: pointer;
  padding: 5px 10px;
}
.tab-btn.active {
  opacity: 1;
  color: var(--primary-color);
  border-bottom: 2px solid var(--primary-color);
}
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.form-input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-color);
}
.rules-editor {
  background: var(--bg-card);
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
}
.rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.rule-input-label {
  flex: 1;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.rule-input-date {
  flex: 1.5;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.rule-input-time {
  flex: 1;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.btn-danger-small {
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.6;
}
.btn-danger-small:hover {
  opacity: 1;
}
.btn-add-rule {
  background: transparent;
  border: 1px dashed var(--primary-color);
  color: var(--primary-color);
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 5px;
}
.btn-add-rule:hover {
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}
.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.dome-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.dome-games-container {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
}
.dome-games-header {
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
}
.dome-games-header h4 {
  margin: 0 0 10px 0;
}
.select-all-wrapper {
  margin-top: 5px;
}
.dome-games-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
}
.game-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  cursor: pointer;
}
.empty-hint {
  color: #aaa;
  font-size: 14px;
}
</style>
