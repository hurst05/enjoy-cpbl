export function hasTicketPurchased(mark) {
  return mark?.ticketPurchased === true
    || Object.values(mark?.ticketPurchasedBy || {}).some(Boolean);
}

export function getFriendsBoughtList(groupMarks, gameId, currentUserUid) {
  return Object.entries(groupMarks || {})
    .filter(([uid, userData]) => (
      uid !== currentUserUid && hasTicketPurchased(userData.marks?.[gameId])
    ))
    .map(([uid, userData]) => userData.displayName || uid);
}
