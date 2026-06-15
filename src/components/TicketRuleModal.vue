<template>
  <div class="modal-overlay">
    <div class="modal-content modal-ticket-rule">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      <h3>🎟️ 售票規則管理</h3>
      
      <div v-if="loading" class="loading-state">載入中...</div>
      
      <div v-else class="rules-container">
        <div v-for="(rules, teamId) in localRules" :key="teamId" class="team-rules-section">
          <h4 class="team-title" :style="{ color: TEAMS[teamId]?.color || '#333' }">
            {{ TEAMS[teamId]?.name || '預設規則 (default)' }}
          </h4>
          
          <div v-for="(rule, index) in rules" :key="index" class="rule-row">
            <input type="text" v-model="rule.label" placeholder="階段名稱" class="rule-input-label" />
            <span class="rule-offset-hint">提前</span>
            <input type="number" v-model.number="rule.offset" class="rule-input-offset" />
            <span class="rule-offset-hint">天</span>
            <button class="btn-danger-small" @click="removeRule(teamId, index)">🗑️</button>
          </div>
          
          <button class="btn-add-rule" @click="addRule(teamId)">+ 新增階段</button>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-primary" @click="saveRules" :disabled="saving">
          {{ saving ? '儲存中...' : '儲存變更' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getTicketRules, saveTicketRules } from '../firebase.js';
import { TEAMS } from '../data/defaultTeams.js';

const emit = defineEmits(['close', 'saved']);

const localRules = ref({});
const loading = ref(true);
const saving = ref(false);

onMounted(async () => {
  try {
    const rules = await getTicketRules();
    localRules.value = rules || {};
  } catch (e) {
    alert('讀取失敗: ' + e.message);
  } finally {
    loading.value = false;
  }
});

const addRule = (teamId) => {
  localRules.value[teamId].push({ label: '新階段', offset: -3 });
};

const removeRule = (teamId, index) => {
  localRules.value[teamId].splice(index, 1);
};

const saveRules = async () => {
  saving.value = true;
  try {
    await saveTicketRules(localRules.value);
    emit('saved', localRules.value);
    emit('close');
  } catch (e) {
    alert('儲存失敗: ' + e.message);
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.rules-container {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}
.team-rules-section {
  margin-bottom: 20px;
  padding: 10px;
  background: var(--bg-card);
  border-radius: 8px;
}
.team-title {
  margin-top: 0;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 5px;
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
.rule-input-offset {
  width: 60px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
}
.rule-offset-hint {
  font-size: 14px;
  color: var(--text-color);
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
</style>
