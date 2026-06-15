<template>
  <div class="modal-overlay">
    <div class="modal-content modal-theme-day">
      <button class="modal-close" aria-label="關閉" @click="$emit('close')">✕</button>
      <h3>🎉 主題日批次管理</h3>
      
      <div class="tabs">
        <button :class="{ active: mode === 'range' }" @click="mode = 'range'">依日期範圍</button>
        <button :class="{ active: mode === 'import' }" @click="mode = 'import'">資料匯入</button>
      </div>

      <div class="form-container" v-if="mode === 'range'">
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

      <div class="form-container" v-else>
        <div class="form-group">
          <div class="flex-between">
            <label>匯入資料 (格式)</label>
            <button class="btn-secondary btn-small" @click="copyTemplate">複製格式</button>
          </div>
          <textarea v-model="importDataText" class="form-input" rows="12" placeholder="貼上資料..."></textarea>
          <p class="help-text">請依照格式填寫。日期支援 YYYYMMDD 或 YYYY-MM-DD。球隊請填寫中文全名（如：中信兄弟、統一獅）。</p>
        </div>
      </div>

      <div class="modal-actions">
        <button v-if="mode === 'range'" class="btn-primary" @click="save" :disabled="saving || !startDate || !endDate || !selectedTeam">
          {{ saving ? '套用中...' : '批次套用' }}
        </button>
        <button v-else class="btn-primary" @click="saveImport" :disabled="saving || !importDataText.trim()">
          {{ saving ? '匯入中...' : '資料匯入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { batchUpdateThemeDays } from '../firebase.js';
import { TEAMS, TEAM_NAME_MAP } from '../data/defaultTeams.js';

const emit = defineEmits(['close', 'saved']);

const startDate = ref('');
const endDate = ref('');
const selectedTeam = ref('');
const themeName = ref('');
const saving = ref(false);

const mode = ref('range');
const importDataText = ref('');

const TEMPLATE = `{
  "涼水季": {
    "開始時間": "20240701",
    "結束時間": "20240705",
    "主場球隊": "統一獅/台鋼雄鷹/富邦悍將/中信兄弟/味全龍/樂天桃園"
  },
  "鷹勇戰士": {
    "開始時間": "20240801",
    "結束時間": "20240802",
    "主場球隊": "統一獅/台鋼雄鷹/富邦悍將/中信兄弟/味全龍/樂天桃園"
  }
}`;

const copyTemplate = () => {
  navigator.clipboard.writeText(TEMPLATE);
  alert('已複製格式範例！請貼上並修改內容。');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const str = String(dateStr);
  if (/^\d{8}$/.test(str)) {
    return str.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  }
  return str;
};

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

const saveImport = async () => {
  if (!importDataText.value.trim()) return;

  let parsedData = null;
  try {
    const text = importDataText.value.trim();
    // Using new Function allows a relaxed JSON syntax (e.g. single quotes, unquoted keys, trailing commas)
    parsedData = new Function("return " + text)();
  } catch (err) {
    alert('資料格式錯誤，請確認內容格式是否正確。\n錯誤訊息：' + err.message);
    return;
  }

  if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
    alert('無效的匯入資料');
    return;
  }

  saving.value = true;
  let totalCount = 0;

  try {
    for (const [name, config] of Object.entries(parsedData)) {
      const start = formatDate(config['開始時間']);
      const end = formatDate(config['結束時間']);
      const teamName = config['主場球隊'];
      const teamId = TEAM_NAME_MAP[teamName] || teamName;

      if (!start || !end || !teamId) {
        throw new Error(`【${name}】的設定缺少必要欄位，或球隊名稱無法辨識`);
      }

      if (start > end) {
        throw new Error(`【${name}】的開始日期不能大於結束日期`);
      }

      const count = await batchUpdateThemeDays(start, end, teamId, name);
      totalCount += count;
    }

    alert(`成功匯入並更新了 ${totalCount} 場比賽的主題日！`);
    emit('saved');
    emit('close');
  } catch (e) {
    alert('匯入失敗: ' + e.message);
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
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}
.flex-between label {
  margin-bottom: 0;
}
.btn-small {
  padding: 4px 8px;
  font-size: 0.85em;
  border-radius: 4px;
}
.btn-secondary {
  background-color: var(--bg-card-hover);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  cursor: pointer;
}
.btn-secondary:hover {
  background-color: var(--border-color);
}
.form-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-color);
  font-family: monospace;
}
.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 5px;
}
.tabs button {
  background: none;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.6;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.tabs button.active {
  opacity: 1;
  border-bottom-color: var(--primary-color);
  font-weight: bold;
}
.tabs button:hover {
  opacity: 1;
}
.help-text {
  font-size: 0.85em;
  color: var(--text-color);
  opacity: 0.7;
  margin-top: 5px;
}
</style>
