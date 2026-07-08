export const REST_SEAT_HOME_TEAM = 'T5';
export const REST_SEAT_LOCATION_KEYWORD = '亞太主';
export const REST_SEAT_REQUIRED_COUNT = 2;

function parseDateParts(date) {
  if (typeof date !== 'string') return null;

  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function getDayOfWeek(date) {
  const parts = parseDateParts(date);
  if (!parts) return null;

  return new Date(parts.year, parts.month - 1, parts.day).getDay();
}

function isWednesday(date, dayOfWeek) {
  if (dayOfWeek) {
    return dayOfWeek === '週三' || dayOfWeek === '三' || dayOfWeek === 'Wed' || dayOfWeek === 'Wednesday';
  }

  return getDayOfWeek(date) === 3;
}

export function getRestSeatGameBasis(game) {
  const shouldUseOriginalBasis = Boolean(game?.isPostponed || game?.originalDate);

  if (shouldUseOriginalBasis) {
    return {
      homeTeam: game?.originalHomeTeam || game?.homeTeam || '',
      date: game?.originalDate || game?.date || '',
      dayOfWeek: game?.originalDayOfWeek || '',
      location: game?.originalLocation || '',
    };
  }

  return {
    homeTeam: game?.homeTeam || '',
    date: game?.date || '',
    dayOfWeek: game?.dayOfWeek || '',
    location: game?.location || '',
  };
}

export function isRestSeatGame(game) {
  const basis = getRestSeatGameBasis(game);

  return (
    basis.homeTeam === REST_SEAT_HOME_TEAM &&
    basis.location.includes(REST_SEAT_LOCATION_KEYWORD) &&
    isWednesday(basis.date, basis.dayOfWeek)
  );
}

export function normalizeMemberList(members) {
  if (!Array.isArray(members)) return [];

  return Array.from(new Set(members.map(member => String(member).trim()).filter(Boolean)));
}

export function getAssignedRestSeatMembers(restSeatData, excludeGameId = null) {
  if (!restSeatData || typeof restSeatData !== 'object') return [];

  return Object.entries(restSeatData).flatMap(([gameId, record]) => {
    if (excludeGameId && gameId === excludeGameId) return [];
    return normalizeMemberList(record?.members);
  });
}

export function getRestSeatEligibleMembers(members, restSeatData, requiredCount = REST_SEAT_REQUIRED_COUNT, excludeGameId = null) {
  const scheduledMembers = normalizeMemberList(members);
  const assignedMembers = new Set(getAssignedRestSeatMembers(restSeatData, excludeGameId));
  const unassignedMembers = scheduledMembers.filter(member => !assignedMembers.has(member));

  return unassignedMembers.length >= requiredCount ? unassignedMembers : scheduledMembers;
}

export function getRestSeatDisplay(gameId, members, restSeatData, requiredCount = REST_SEAT_REQUIRED_COUNT) {
  const savedMembers = normalizeMemberList(restSeatData?.[gameId]?.members);

  if (savedMembers.length > 0) {
    return {
      status: 'saved',
      label: '歇歇席',
      members: savedMembers,
    };
  }

  return {
    status: 'candidates',
    label: '可能歇歇席',
    members: getRestSeatEligibleMembers(members, restSeatData, requiredCount, gameId),
  };
}
