<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      <h3>🎉 主題日批次管理</h3>
      
      <div class="form-container">
        <div class="form-group">
          <label>開始日期</label>
          <input type="date" v-model="startDate" class="form-input" />
        </div>
        
        <div class="form-group">
          <label>結束日期</label>
          <input type="date" v-model="endDate" class="form-input" />
        </div>
        
        <div class="form-group">
          <label>主場球隊</label>
          <select v-model="selectedTeam" class="form-input">
            <option disabled value="">請選擇球隊</option>
            <option v-for="(team, id) in TEAMS" :key="id" :value="id">
              {{ team.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>主題日名稱 (留空為清除)</label>
          <input type="text" v-model="themeName" class="form-input" placeholder="例如：涼水季" />
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-primary" @click="save" :disabled="saving || !startDate || !endDate || !selectedTeam">
          {{ saving ? '套用中...' : '批次套用' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { batchUpdateThemeDays } from '../firebase.js';
import { TEAMS } from '../data/defaultTeams.js';

const emit = defineEmits(['close', 'saved']);

const startDate = ref('');
const endDate = ref('');
const selectedTeam = ref('');
const themeName = ref('');
const saving = ref(false);

const save = async () => {
  if (startDate.value > endDate.value) {
    alert('開始日期不能大於結束日期');
    return;
  }
  
  saving.value = true;
  try {
    const count = await batchUpdateThemeDays(startDate.value, endDate.value, selectedTeam.value, themeName.value);
    alert(`成功更新了 ${count} 場比賽的主題日！`);
    emit('saved');
    emit('close');
  } catch (e) {
    alert('更新失敗: ' + e.message);
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.form-container {
  padding: 10px 0;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: var(--text-color);
}
.form-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-color);
}
.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
