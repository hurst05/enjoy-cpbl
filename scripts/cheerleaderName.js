const CHEERLEADER_NAME_CORRECTIONS = {
  邊荷律: '荷律',
  瑄瑄: '瑄',
  金渡兒: '渡兒',
  Ella: 'ELLA',
  姸蓁: '妍蓁',
  妡蔆: '妡0',
  Nina: 'NINA',
  陳怡婷: 'ET',
};

export function normalizeCheerleaderName(name) {
  if (typeof name !== 'string') return name;

  const normalizedName = name.trim().split(/\s+/u)[0];

  return CHEERLEADER_NAME_CORRECTIONS[normalizedName] ?? normalizedName;
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
