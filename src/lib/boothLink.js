// The line between the broadcast (the main window, what's screen-shared) and the commissioner's Broadcast Booth window.
// Both are in the same browser, so they talk over a BroadcastChannel: the broadcast sends what's happening a few times a
// second, the booth sends commands back (pause, speed, jump, deny a graphic, put up a stat card, timeouts, test tools).
export function boothChannel(gameId) {
  if (typeof BroadcastChannel === 'undefined' || gameId == null) return null;
  return new BroadcastChannel(`mfl-booth-${gameId}`);
}

// What kind of stat card a player gets from his position (the same cards the graphics producer uses).
export function cardKindFor(pos, stats = {}) {
  if (pos === 'QB') return 'qb';
  if (pos === 'RB') return 'rush';
  if (pos === 'WR' || pos === 'TE') return 'rec';
  if (pos === 'CB' || pos === 'SS') return 'ball';
  return (stats.sacks || 0) > 0 ? 'rush_d' : 'tackle';
}
