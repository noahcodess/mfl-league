// Picks the plays worth replaying in the breaks: the play of the quarter (end of the 1st and 3rd) and the plays of the half
// (2 to 4 at halftime; 4 only when the fourth one is really good). Each play gets a highlight value from what happened.
const SHOWN = new Set(['run', 'pass', 'sack', 'kickoff', 'punt', 'fg']);   // plays with something to watch

export function playValue(p) {
  if (!SHOWN.has(p.kind) || p.events?.some((e) => e.type === 'flag')) return 0;
  const r = p.result || {}, gain = Math.max(0, r.gain || 0), dist = p.events?.find((e) => e.kind === 'fg')?.dist || 0;
  if (p.kind === 'fg') return p.headline === 'FIELD GOAL' && dist >= 48 ? 20 + dist / 2 : 0;
  if ((p.kind === 'kickoff' || p.kind === 'punt') && !r.td && !r.turnover) return 0;
  let v = gain * 1.1;
  if (r.td) v += 45;
  if (r.turnover) v += 38;
  if (r.safety) v += 40;
  if (p.kind === 'sack') v += 12;
  if (p.before?.down === 4 && r.firstDown) v += 16;
  else if (p.before?.down === 3 && p.before?.toGo >= 8 && r.firstDown) v += 8;
  if (p.keyPlay) v += 5;
  return v;
}

// The best play of quarter q (null if nothing worth showing).
export function playOfQuarter(plays, q) {
  let best = null, bv = 0;
  plays.forEach((p) => { const v = p.before.quarter === q ? playValue(p) : 0; if (v > bv) { bv = v; best = p; } });
  return best;
}

// The plays of the half, in the order they happened: the best two, a third if it was a real highlight, a fourth only if great.
export function playsOfHalf(plays) {
  const ranked = plays.filter((p) => p.before.quarter <= 2).map((p) => [p, playValue(p)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const pick = ranked.filter(([, v], k) => k < 2 || (k === 2 && v >= 35) || (k === 3 && v >= 58)).slice(0, 4).map(([p]) => p);
  return pick.sort((a, b) => a.n - b.n);
}

// The plays of the game for the final report, in the order they happened: never fewer than 2, never more than 5. The best
// two always; a third, fourth and fifth only when they were real highlights.
export function playsOfTheGame(plays) {
  const ranked = plays.map((p) => [p, playValue(p)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const pick = ranked.filter(([, v], k) => k < 2 || (k === 2 && v >= 30) || (k === 3 && v >= 45) || (k === 4 && v >= 60)).slice(0, 5).map(([p]) => p);
  return pick.sort((a, b) => a.n - b.n);
}
