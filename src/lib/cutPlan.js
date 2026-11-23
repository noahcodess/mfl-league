// The broadcast's pre-play cutscenes, and which play gets which: the Creepers whiteout (whiteoutPlan), the opener of a
// game where the home team wears the uniform named exactly "Bloodbath", and the two-minute warning. The warning comes
// before the first snap after the clock passes 2:00 in the 2nd or 4th quarter: right after the play that ran through it,
// or when the clock runs down to 2:00 between plays (the engine marks both). It wins over the others if they ever land on
// the same play. Timings in seconds from the cut: the transition in, the shot, the transition out, back to the field.
import { STING_MID } from './pixelSwarm.js';
import { isWhiteout, whiteoutPlays, WO } from './whiteoutPlan.js';

export const BLOODBATH_NAME = 'Bloodbath';
const MID = STING_MID / 1000;
export const CUT = {
  wo: WO,
  bb: { shotIn: MID, back: 13.5, shotOut: 13.5 + MID, len: 17.5 },   // Welcome To The Bloodbath (19.2 s) ends as they break the huddle
  tmw: { shotIn: MID, back: MID + 3.8, shotOut: 2 * MID + 3.8, len: 2 * MID + 4 },
};
export const HUDDLE_CUTS = new Set(['wo', 'bb']);   // these hold on the huddle and give the play a real one
const SNAP = new Set(['run', 'pass', 'sack', 'penalty', 'spike']);

export const isBloodbath = (kits) => !!kits?.special && kits.home?.name === BLOODBATH_NAME;

// { playIndex: 'wo' | 'bb' | 'tmw' }.
export function cutPlan(plays, home, kits, seed = 1) {
  const out = {};
  if (isWhiteout(home, kits)) whiteoutPlays(plays, seed).forEach((i) => { out[i] = 'wo'; });
  else if (isBloodbath(kits) || (import.meta.env.DEV && typeof window !== 'undefined' && /[?&]devbb/.test(window.location.search))) { const first = plays.findIndex((p) => SNAP.has(p.kind)); if (first >= 0) out[first] = 'bb'; }   // once a game: the opening snap
  plays.forEach((p, i) => { if (p.tmwBefore || plays[i - 1]?.twoMinute) out[i] = 'tmw'; });
  if (import.meta.env.DEV && typeof window !== 'undefined' && /[?&]devtmw/.test(window.location.search)) out[2] = 'tmw';   // dev only: see the card on play 3
  return out;
}

// Is this whiteout the game's first (maxed-out pulse)? cuts: from cutPlan.
export const firstWhiteout = (cuts, i) => !Object.keys(cuts).some((k) => cuts[k] === 'wo' && Number(k) < i);
