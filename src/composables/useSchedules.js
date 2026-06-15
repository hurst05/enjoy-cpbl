import { ref } from 'vue';
import { getSchedules, getThemeDays, getAllCheerleaders, getTicketSchedules } from '../firebase.js';

export function useSchedules() {
  const scheduleData = ref({});
  const cheerleaderData = ref({});
  const ticketRules = ref({});
  const isMounted = ref(false);

  async function loadTicketRules() {
    try {
      const schedules = await getTicketSchedules();
      ticketRules.value = schedules || {};
    } catch (e) {
      console.error('載入售票時程失敗:', e);
    }
  }

  async function loadScheduleData() {
    try {
      const data = await getSchedules() || {};
      const themeDays = await getThemeDays() || {};
      
      for (const key in data) {
        data[key].themeDay = themeDays[key] || null;
      }
      
      scheduleData.value = data;

      const allCheers = await getAllCheerleaders() || {};
      cheerleaderData.value = allCheers;
      isMounted.value = true;
    } catch (e) {
      console.error('載入賽程資料失敗:', e);
    }
  }

  async function initSchedules() {
    await loadTicketRules();
    await loadScheduleData();
  }

  return {
    scheduleData,
    cheerleaderData,
    ticketRules,
    isMounted,
    loadTicketRules,
    loadScheduleData,
    initSchedules
  };
}
