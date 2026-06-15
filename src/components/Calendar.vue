<template>
  <div>
    <!-- Month Navigation -->
    <Teleport to="#sidebar-month-nav" :disabled="isMobile">
      <nav id="month-nav" class="month-nav sidebar-month-nav" :class="{'mobile-nav': isMobile}">
        <div class="month-nav-controls">
          <button class="btn-month-arrow" aria-label="上個月" @click="changeMonth(-1)">‹</button>
          <h2 class="month-label">{{ currentYear }} 年 {{ currentMonth + 1 }} 月</h2>
          <button class="btn-month-arrow" aria-label="下個月" @click="changeMonth(1)">›</button>
        </div>
        <button class="btn-today btn-full" @click="goToToday">今天</button>
      </nav>
    </Teleport>

    <!-- Calendar Grid (Desktop) -->
    <div class="calendar-container">
      <div class="calendar-dow-header">
        <div class="dow">一</div><div class="dow">二</div><div class="dow">三</div><div class="dow">四</div><div class="dow">五</div><div class="dow dow-sat">六</div><div class="dow dow-sun">日</div>
      </div>
      <div class="calendar-grid">
        <div v-for="i in firstDayOffset" :key="'empty-'+i" class="calendar-cell calendar-cell-empty"></div>
        
        <div v-for="day in daysInMonth" :key="'day-'+day" 
             class="calendar-cell"
             :class="getCellClasses(day)">
          <div class="cell-day-number">
            <span class="day-text">{{ day }}</span>
            <span v-if="getHolidayName(day)" class="cell-holiday-tag">{{ getHolidayName(day) }}</span>
          </div>
          
          <div v-if="getGamesForDay(day).length" class="cell-games">
            <GameCard 
              v-for="game in getGamesForDay(day)" 
              :key="game.gameId"
              :game="game"
              mode="grid"
              :cheerleaderData="cheerleaderData"
              :userMarks="userMarks"
              :groupMarks="groupMarks"
              :ticketRules="ticketRules"
              :isAdmin="isAdmin"
              :isFilterActive="isFilterActive"
              :isMatched="isFilterActive ? matchedGameIds.has(game.gameId) : true"
              @click="$emit('game-click', game)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- List View (Mobile) -->
    <div class="list-container">
      <div v-for="day in daysWithGames" :key="'list-'+day" class="list-day-section" :class="{'list-day-today': isToday(day)}">
        <div class="list-day-header">
          <span class="list-day-date">{{ currentMonth + 1 }}/{{ day }}</span>
          <span class="list-day-dow" :class="{'list-day-weekend': isWeekend(day)}">({{ getDowName(day) }})</span>
          <span v-if="getHolidayName(day)" class="list-holiday-badge">{{ getHolidayName(day) }}</span>
        </div>
        <GameCard 
          v-for="game in getGamesForDay(day)" 
          :key="game.gameId"
          :game="game"
          mode="list"
          :cheerleaderData="cheerleaderData"
          :userMarks="userMarks"
          :groupMarks="groupMarks"
          :ticketRules="ticketRules"
          :isAdmin="isAdmin"
          :isFilterActive="isFilterActive"
          :isMatched="isFilterActive ? matchedGameIds.has(game.gameId) : true"
          @click="$emit('game-click', game)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import GameCard from './GameCard.vue';

const props = defineProps({
  scheduleData: Object,
  cheerleaderData: Object,
  userMarks: Object,
  groupMarks: Object,
  ticketRules: Object,
  isAdmin: Boolean,
  isFilterActive: Boolean,
  matchedGameIds: Object
});

const emit = defineEmits(['game-click']);

const currentYear = ref(2026);
const currentMonth = ref(5);
const holidays = ref({});
const isMobile = ref(false);

const goToToday = () => {
  const now = new Date();
  currentYear.value = now.getFullYear();
  currentMonth.value = now.getMonth();
  loadHolidays(currentYear.value);
};

const changeMonth = (delta) => {
  currentMonth.value += delta;
  if (currentMonth.value > 11) {
    currentMonth.value = 0;
    currentYear.value++;
    loadHolidays(currentYear.value);
  } else if (currentMonth.value < 0) {
    currentMonth.value = 11;
    currentYear.value--;
    loadHolidays(currentYear.value);
  }
};

const loadHolidays = async (year) => {
  try {
    const url = `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`;
    const res = await fetch(url);
    const data = await res.json();
    const map = {};
    data.forEach((d) => {
      if (d.date && d.date.length === 8) {
        const dateStr = d.date.slice(0, 4) + '-' + d.date.slice(4, 6) + '-' + d.date.slice(6, 8);
        map[dateStr] = {
          isHoliday: d.isHoliday === true || d.isHoliday === '是',
          name: d.holidayCategory || d.description || '',
        };
      }
    });
    holidays.value = map;
  } catch (e) {
    console.warn('無法載入台灣國定假日資料:', e);
  }
};

onMounted(() => {
  goToToday();
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const firstDayOffset = computed(() => {
  const day = new Date(currentYear.value, currentMonth.value, 1).getDay();
  return day === 0 ? 6 : day - 1;
});

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate();
});

const daysWithGames = computed(() => {
  const days = [];
  for (let day = 1; day <= daysInMonth.value; day++) {
    if (getGamesForDay(day).length > 0) days.push(day);
  }
  return days;
});

const formatDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getDateStr = (day) => {
  return formatDate(new Date(currentYear.value, currentMonth.value, day));
};

const getGamesForDay = (day) => {
  const dateStr = getDateStr(day);
  if (!props.scheduleData) return [];
  return Object.values(props.scheduleData).filter((g) => g.date === dateStr);
};

const isToday = (day) => {
  return getDateStr(day) === formatDate(new Date());
};

const getDayOfWeek = (day) => {
  return new Date(currentYear.value, currentMonth.value, day).getDay();
};

const isWeekend = (day) => {
  const dow = getDayOfWeek(day);
  return dow === 0 || dow === 6;
};

const getDowName = (day) => {
  return ['日', '一', '二', '三', '四', '五', '六'][getDayOfWeek(day)];
};

const getHolidayInfo = (day) => {
  return holidays.value[getDateStr(day)];
};

const getHolidayName = (day) => {
  const info = getHolidayInfo(day);
  if (info?.name && !['星期六', '星期日'].includes(info.name)) return info.name;
  return null;
};

const getCellClasses = (day) => {
  const info = getHolidayInfo(day);
  const holiday = info?.isHoliday || isWeekend(day);
  return {
    'calendar-cell-weekend': isWeekend(day),
    'calendar-cell-holiday': holiday,
    'calendar-cell-today': isToday(day)
  };
};
</script>
