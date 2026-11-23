// The crowd's one-off reactions on a play, on top of the beds: an eruption for a home score or a takeaway, a big cheer for
// a stop, a sack or a home big play, a groan when the visitors hurt them, boos when the flag is on the home team. And the PA
// announcer's "third down!" on some big visiting 3rd downs (only if those clips exist). Pure: the same play always gets the
// same reactions, at the same moments.
const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) >>> 0; x = ((x ^ (x >>> 13)) * 1274126177) >>> 0; return x / 4294967296; };
export const ANNOUNCERS = 4;

// play: the play. S: its scene (tEnd, tSack, flag). seed: the game's seed.
// Returns [{ name ('eruption' | 'cheer' | 'groan' | 'boo' | 'third1'..'third4'), at (scene seconds, or 'score' = as the score lands), gain }].
export function cuesFor(play, S, seed = 1) {
  const out = [], r = play.result || {}, k = play.kind, home = play.off === 'home', d = play.before?.down, pz = play.pulse || {};
  const b4 = play.before?.score, af = play.after?.score, h = af && b4 ? af.home - b4.home : 0, a = af && b4 ? af.away - b4.away : 0;
  const end = Math.max(S.T0 ?? 0, (S.tEnd ?? 0) - 0.1), add = (name, at, gain) => out.push({ name, at, gain });
  const flag = (play.events || []).find((e) => e.type === 'flag');
  if (flag) add(flag.team === 'home' ? 'boo' : 'cheer', (S.flag?.t ?? end) + 1, flag.team === 'home' ? 0.9 : flag.crowd ? 0.85 : 0.55);   // the flag hits the ground
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
