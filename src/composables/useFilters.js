import { ref, computed } from 'vue';
import { TEAMS } from '../data/defaultTeams.js';
import { hasTicketPurchased } from '../utils/groupMarks.js';

export function useFilters(scheduleData, cheerleaderData, userMarks, groupMarks) {
  const filters = ref({
    team: '',
    location: '',
    cheerTeam: '',
    cheerMembers: [],
    marks: []
  });

  const availableMarks = computed(() => {
    const marks = [
      { id: 'wantToWatch', label: '想去的' },
      { id: 'ticketPurchased', label: '買票的' }
    ];
    if (groupMarks.value && Object.keys(groupMarks.value).length > 0) {
      marks.push({ id: 'groupWantToWatch', label: '群組想去的' });
      marks.push({ id: 'groupTicketPurchased', label: '群組已買票的' });
    }
    return marks;
  });

  const availableTeams = computed(() => {
    return Object.entries(TEAMS).map(([id, team]) => ({ id, name: team.short || team.name }));
  });

  const availableLocations = computed(() => {
    const locs = new Set();
    Object.values(scheduleData.value).forEach(g => {
      if (g.location) locs.add(g.location);
    });
    return Array.from(locs).sort();
  });

  const availableCheerTeams = computed(() => {
    return Object.values(TEAMS).filter(t => t.cheerName).map(t => t.cheerName);
  });

  const cheerTeamMembers = computed(() => {
    const mapping = {};
    Object.values(TEAMS).forEach(t => {
      if (t.cheerName) mapping[t.cheerName] = new Set();
    });
    
    Object.entries(cheerleaderData.value).forEach(([gameId, gameCheers]) => {
      const game = scheduleData.value[gameId];
      if (!game) return;
      const homeCheerName = TEAMS[game.homeTeam]?.cheerName;
      const awayCheerName = TEAMS[game.awayTeam]?.cheerName;
      
      if (homeCheerName && gameCheers.homeMembers) {
        gameCheers.homeMembers.forEach(m => mapping[homeCheerName].add(m));
      }
      if (awayCheerName && gameCheers.awayMembers) {
        gameCheers.awayMembers.forEach(m => mapping[awayCheerName].add(m));
      }
    });
    
    const result = {};
    for (const team in mapping) {
      result[team] = Array.from(mapping[team]).sort();
    }
    return result;
  });

  const isFilterActive = computed(() => {
    return filters.value.team !== '' || 
           filters.value.location !== '' || 
           filters.value.cheerTeam !== '' || 
           filters.value.cheerMembers.length > 0 ||
           filters.value.marks.length > 0;
  });

  function isGameMatched(game, gameCheers) {
    const hasTeamFilter = filters.value.team !== '';
    const hasLocFilter = filters.value.location !== '';
    const hasCheerFilter = filters.value.cheerTeam !== '' || filters.value.cheerMembers.length > 0;

    if (hasTeamFilter && game.homeTeam !== filters.value.team && game.awayTeam !== filters.value.team) {
      return false;
    }

    if (hasLocFilter && game.location !== filters.value.location) {
      return false;
    }

    if (hasCheerFilter) {
      const homeCheerName = TEAMS[game.homeTeam]?.cheerName;
      const awayCheerName = TEAMS[game.awayTeam]?.cheerName;
      const hasHomeCheer = homeCheerName === filters.value.cheerTeam && gameCheers?.homeMembers?.length > 0;
      const hasAwayCheer = awayCheerName === filters.value.cheerTeam && gameCheers?.awayMembers?.length > 0;

      if (filters.value.cheerMembers.length > 0) {
        const homeMatch = hasHomeCheer && filters.value.cheerMembers.some(m => gameCheers.homeMembers.includes(m));
        const awayMatch = hasAwayCheer && filters.value.cheerMembers.some(m => gameCheers.awayMembers.includes(m));
        if (!homeMatch && !awayMatch) return false;
      } else {
        if (!hasHomeCheer && !hasAwayCheer) return false;
      }
    }

    const hasMarksFilter = filters.value.marks && filters.value.marks.length > 0;
    if (hasMarksFilter) {
      let markMatched = false;
      const gameId = game.gameId;
      const userMark = userMarks.value?.[gameId];
      
      if (filters.value.marks.includes('wantToWatch') && userMark?.wantToWatch) markMatched = true;
      if (filters.value.marks.includes('ticketPurchased') && hasTicketPurchased(userMark)) markMatched = true;
      
      if (!markMatched && (filters.value.marks.includes('groupWantToWatch') || filters.value.marks.includes('groupTicketPurchased'))) {
        if (groupMarks.value) {
          for (const [uid, userData] of Object.entries(groupMarks.value)) {
            const gMark = userData.marks?.[gameId];
            if (filters.value.marks.includes('groupWantToWatch') && gMark?.wantToWatch) markMatched = true;
            if (filters.value.marks.includes('groupTicketPurchased') && hasTicketPurchased(gMark)) markMatched = true;
            if (markMatched) break;
          }
        }
      }

      if (!markMatched) return false;
    }

    return true;
  }

  const matchedGameIds = computed(() => {
    if (!isFilterActive.value) return new Set();
    const matched = new Set();
    for (const gameId in scheduleData.value) {
      const game = scheduleData.value[gameId];
      const gameCheers = cheerleaderData.value[gameId];
      if (isGameMatched(game, gameCheers)) {
        matched.add(gameId);
      }
    }
    return matched;
  });

  function clearFilters() {
    filters.value = {
      team: '',
      location: '',
      cheerTeam: '',
      cheerMembers: [],
      marks: []
    };
  }

  return {
    filters,
    availableMarks,
    availableTeams,
    availableLocations,
    availableCheerTeams,
    cheerTeamMembers,
    isFilterActive,
    matchedGameIds,
    clearFilters
  };
}
