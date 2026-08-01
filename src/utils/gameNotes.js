const HTTP_URL_PATTERN = /https?:\/\/[^\s]+/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:)}\]，。！？；：）】》]+$/u;

export function normalizeGameNote(note) {
  return typeof note === 'string' ? note.trim() : '';
}

export function splitNoteContent(note) {
  const content = typeof note === 'string' ? note : '';
  if (!content) return [];

  const parts = [];
  let lastIndex = 0;

  for (const match of content.matchAll(HTTP_URL_PATTERN)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, matchIndex) });
    }

    const matchedUrl = match[0];
    const trailingText = matchedUrl.match(TRAILING_URL_PUNCTUATION)?.[0] || '';
    const url = trailingText ? matchedUrl.slice(0, -trailingText.length) : matchedUrl;

    if (url) parts.push({ type: 'link', value: url });
    if (trailingText) parts.push({ type: 'text', value: trailingText });
    lastIndex = matchIndex + matchedUrl.length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: content }];
}

export function getFriendGameNotes(groupMarks, gameId, currentUserUid) {
  return Object.entries(groupMarks || {}).flatMap(([uid, userData]) => {
    if (uid === currentUserUid) return [];

    const note = normalizeGameNote(userData?.marks?.[gameId]?.note);
    if (!note) return [];

    return [{
      uid,
      displayName: userData?.displayName || uid,
      note,
    }];
  });
}

export function hasFriendGameNote(groupMarks, gameId, currentUserUid) {
  return getFriendGameNotes(groupMarks, gameId, currentUserUid).length > 0;
}

export function hasAnyGameNote(userMarks, groupMarks, gameId, currentUserUid) {
  const ownNote = normalizeGameNote(userMarks?.[gameId]?.note);
  return Boolean(ownNote) || hasFriendGameNote(groupMarks, gameId, currentUserUid);
}
