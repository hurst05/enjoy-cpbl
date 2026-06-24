export function normalizeCheerleaderName(name) {
  if (typeof name !== 'string') return name;

  return name.trim().split(/\s+/u)[0];
}

export function normalizeCheerleaderRecord(record) {
  if (!record || typeof record !== 'object') return record;

  const normalized = { ...record };

  if (Array.isArray(record.homeMembers)) {
    normalized.homeMembers = record.homeMembers.map(normalizeCheerleaderName);
  }

  if (Array.isArray(record.awayMembers)) {
    normalized.awayMembers = record.awayMembers.map(normalizeCheerleaderName);
  }

  return normalized;
}
