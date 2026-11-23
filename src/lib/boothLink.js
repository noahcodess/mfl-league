// The line between the broadcast (the main window, what's screen-shared) and the commissioner's Broadcast Booth window.
// Both are in the same browser, so they talk over a BroadcastChannel: the broadcast sends what's happening a few times a
// second, the booth sends commands back (pause, speed, jump, deny a graphic, put up a stat card, timeouts, test tools).
export function boothChannel(gameId) {
  if (typeof BroadcastChannel === 'undefined' || gameId == null) return null;
  return new BroadcastChannel(`mfl-booth-${gameId}`);
}

// What kind of stat card a player gets from his position: every position has its own (a kicker's field goals, a lineman's
// sacks allowed, a corner's pass breakups), never a quarterback's numbers on a kicker.
const KIND = { QB: 'qb', RB: 'rush', WR: 'rec', TE: 'rec', OT: 'ol', OG: 'ol', C: 'ol', DE: 'dl', DT: 'dl', DL: 'dl', LB: 'lb', CB: 'db', SS: 'db', FS: 'db', K: 'k', P: 'p' };
export function cardKindFor(pos, stats = {}) {
  const k = KIND[pos];
  if (k === 'k' && !(stats.fga || stats.xpa) && stats.punts) return 'p';   // the kicker punts too: show his punting if that's all he's done
  return k || ((stats.sacks || 0) > 0 ? 'rush_d' : 'tackle');
}
