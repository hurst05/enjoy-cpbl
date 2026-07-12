export function getFriendsBoughtList(groupMarks, gameId, currentUserUid) {
  return Object.entries(groupMarks || {})
    .filter(([uid, userData]) => (
      uid !== currentUserUid && userData.marks?.[gameId]?.ticketPurchased
    ))
    .map(([uid, userData]) => userData.displayName || uid);
}
