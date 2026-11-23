// The crowd's one-off reactions on a play, on top of the beds (and the officials' whistles): an eruption for a home score or a takeaway, a big cheer for
// a stop, a sack or a home big play, a groan when the visitors hurt them, boos when the flag is on the home team. And the PA
// announcer's "third down!" on some big visiting 3rd downs (only if those clips exist). Pure: the same play always gets the
// same reactions, at the same moments.
const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) >>> 0; x = ((x ^ (x >>> 13)) * 1274126177) >>> 0; return x / 4294967296; };
export const ANNOUNCERS = 4;

// play: the play. S: its scene (tEnd, tSack, flag). seed: the game's seed. next: the play after it, or 'end' after the last one (did the quarter end?).
// Returns [{ name ('eruption' | 'cheer' | 'groan' | 'boo' | 'third1'..'third4' | 'whPlay' | 'whQuarter'), at (scene seconds,
// 'score' = as the score lands, 'call' = as the referee announces a penalty), gain, delay (seconds after at, whistles) }].
export function cuesFor(play, S, seed = 1, next = null) {
  const out = [], r = play.result || {}, k = play.kind, home = play.off === 'home', d = play.before?.down, pz = play.pulse || {};
  const b4 = play.before?.score, af = play.after?.score, h = af && b4 ? af.home - b4.home : 0, a = af && b4 ? af.away - b4.away : 0;
  const end = Math.max(S.T0 ?? 0, (S.tEnd ?? 0) - 0.1), add = (name, at, gain) => out.push({ name, at, gain });
  const flag = (play.events || []).find((e) => e.type === 'flag');
  // The officials' whistles: the play's over (a few at once on a fumble or a pile at the goal line), or the long one when
  // the quarter runs out. Not on a score: they signal that one.
  const over = next === 'end', ranOut = over || (!!next && next.before?.quarter !== play.before?.quarter && play.after?.clock > 0);   // the clock ran out after the whistle (or the game's over)
  const qEnd = (play.after?.clock <= 0 || ranOut) && ((play.before?.quarter ?? 5) <= 4 || over), pile = r.turnover === 'fumble' || (k === 'run' && (r.gain ?? 9) <= 1 && (play.before?.ballOn ?? 0) >= 95);
  if (qEnd) out.push({ name: 'whQuarter', at: (S.tEnd ?? end) + (ranOut ? 2.2 : 0.15), gain: 0.85 });
  else if (h < 6 && a < 6 && !['xp', 'two'].includes(k)) (pile ? [0, 0.08, 0.19] : [0]).forEach((dl, n) => out.push({ name: 'whPlay', at: (S.tEnd ?? end) + 0.05, gain: n ? 0.6 : 0.75, delay: dl }));
  if (flag) {   // boos (or a cheer) as the referee announces it; a visitor's false start or delay they all saw: they erupt as the flag flies
    const seen = flag.team === 'away' && k === 'penalty' && play.off === 'away' && S.flag;
    if (seen) add('eruption', S.flag.t + 0.22 + 0.12, flag.crowd ? 1 : 0.75);
    else add(flag.team === 'home' ? 'boo' : 'cheer', 'call', flag.team === 'home' ? 0.95 : 0.6);
  }
  if (!home && d >= 3 && pz.show && (pz.v ?? 0) >= 55 && hash(seed, play.n * 3 + 1) < 0.35) add(`third${1 + Math.floor(hash(play.n, seed) * ANNOUNCERS)}`, 0.9, 1);
  const onside = (play.events || []).find((e) => e.type === 'onside');
  if (onside) { const kickHome = play.off === 'home'; const ours = onside.got === kickHome; add(ours ? 'eruption' : 'groan', end, ours ? 1 : 0.5); return out; }
  if (h >= 6) return add('eruption', 'score', 1), out;
  if (a >= 6) return add('groan', 'score', 0.9), out;
  if (k === 'fg') {   // good: cheer for theirs, a groan for the visitors'; no good: the other way around
    if (h > 0) add('cheer', 'score', 0.9); else if (a > 0) add('groan', 'score', 0.45); else add(home ? 'groan' : 'cheer', end, 0.8);
    return out;
  }
  if (k === 'xp' || k === 'two') { if (h > 0) add('cheer', end, k === 'two' ? 0.9 : 0.45); else if (k === 'two' && !home) add('cheer', end, 0.8); return out; }
  if (h === 2) return add('eruption', end, 0.9), out;   // safety
  if (a === 2) return add('groan', end, 0.8), out;
  if (r.turnover === 'int' || r.turnover === 'fumble') return add(home ? 'groan' : 'eruption', end, 1), out;
  if (r.turnover === 'downs') return add(home ? 'groan' : 'eruption', end, home ? 0.8 : 0.9), out;
  if (k === 'sack') return add(home ? 'groan' : 'cheer', S.tSack ?? end, home ? 0.6 : 0.9), out;
  if (k === 'penalty' || k === 'kneel' || k === 'spike' || k === 'punt' || k === 'kickoff') return out;
  if (!home && d >= 3 && !r.firstDown && !r.td) return add('cheer', end, 0.85), out;   // a 3rd/4th-down stop
  if (home && ((r.gain ?? 0) >= 15 || (d >= 3 && r.firstDown))) add('cheer', end, (r.gain ?? 0) >= 25 ? 0.9 : 0.65);
  else if (!home && (r.gain ?? 0) >= 20) add('groan', end, 0.6);
  return out;
}
