// The AI coaches: what the offense calls (by down, distance, field position, score and clock), what the defense calls
// (coverage and whether to blitz), fourth-down decisions, and going for two.
import { fgOdds } from './simKicks.js';
import { pickPlay } from './simPlaybook.js';

// Seconds left in regulation (0 in overtime) and how far the side with the ball is ahead.
const left = (s) => (s.ot ? 0 : (4 - s.quarter) * s.qlen + s.clock);
const lead = (s) => s.score[s.poss] - s.score[s.poss === 'home' ? 'away' : 'home'];

// Returns { type: 'run' | 'pass' | 'punt' | 'fg' | 'kneel', sub }.
export function offenseCall(G) {
  const { R, s } = G, up = lead(s), t = left(s), toGoal = 100 - s.ballOn, late = s.quarter === 4 && !s.ot;
  if (late && up > 0 && s.clock < 40 * (4 - s.down) - 10 * G.s.to[G.defSide] && s.down < 4) return { type: 'kneel' };
  if (s.down === 4) {
    const fgDist = toGoal + 17, must = (late && up < 0 && (t < 150 || up < -8)) || s.ot;
    const go = s.toGo <= 1 ? (s.ballOn > 45 ? 0.75 : s.ballOn > 30 ? 0.35 : 0.05) : s.toGo <= 3 ? (s.ballOn > 55 && fgDist > 52 ? 0.5 : 0.08) : 0;
    if (must && up < -3 && !s.ot) return play(G, true);
    if (fgDist <= 56 && (s.ot || !(must && up < -3)) && !(s.toGo <= 1 && toGoal <= 3 && R.chance(0.5)) && fgOdds(fgDist) > (s.ot ? 0.3 : 0.45)) return { type: 'fg' };
    if (must || R.chance(go)) return play(G, true);
    return s.ot ? play(G, true) : { type: 'punt' };
  }
  return play(G, false);
}

function play(G, must) {
  const { R, s } = G, up = lead(s), t = left(s), toGoal = 100 - s.ballOn, hurry = (s.quarter === 2 && s.clock < 60) || (s.quarter === 4 && up < 0 && t < 180);
  let pass = s.down === 1 ? 0.5 : s.toGo >= 8 ? 0.8 : s.toGo >= 4 ? 0.62 : 0.35;
  if (hurry) pass = 0.88; else if ((s.quarter === 4 && up > 0 && t < 240) || (s.quarter >= 3 && up >= 17)) pass -= 0.3; else if (up < -14) pass += 0.15;   // a big lead keeps it on the ground
  if (up >= 24) pass = Math.min(pass, 0.2);                                         // way ahead: run it and get out of here
  pass += (G.O.passEdge || 0);                                                       // lean on what this offense does best
  const side = s.poss, hot = G.hot?.[side] || 0, mine = G.mom * (side === 'home' ? 1 : -1);
  if (!hurry) pass += Math.max(-0.12, Math.min(0.1, hot * 0.025));                    // a hot quarterback keeps throwing; a cold one hands off
  const ctx = { short: s.toGo <= 2, red: toGoal <= 20, clock: (s.quarter === 4 && up > 0 && t < 300) || up >= 17, hurry, long: s.toGo >= 8 && s.down >= 3,
    blitzy: (G.blitzes?.[side === 'home' ? 'away' : 'home'] || 0) > 4 };
  if (s.toGo <= 1 && !hurry && R.chance(0.45)) return pickPlay(G, 'run', R.chance(0.4) ? 'sneak' : 'inside', ctx);
  if (!R.chance(pass)) return pickPlay(G, 'run', R.chance(toGoal < 6 ? 0.7 : 0.58) ? 'inside' : 'outside', ctx);
  const far = must ? s.toGo : s.toGo * 0.8, roll = R.r() - Math.max(0, mine) * 0.08, deepOk = toGoal > 22;   // momentum makes a coach take his shot
  const sub = far > 12 || (hurry && t < 40 && deepOk) ? (roll < 0.5 && deepOk ? 'deep' : 'medium') : far > 6 ? (roll < 0.18 && deepOk ? 'deep' : roll < 0.7 ? 'medium' : 'short')
    : roll < 0.12 && deepOk ? 'deep' : roll < 0.4 ? 'medium' : roll < 0.75 ? 'short' : 'quick';
  return pickPlay(G, 'pass', sub, ctx);
}

// Returns { cov: 'man' | 'zone', blitz, prevent }. Reads the offense's habits: blitz a pass-happy team on third and long,
// play zone against a team that's beating man, and sit back in prevent when protecting a late lead.
export function defenseCall(G) {
  const { R, s } = G, long = s.toGo >= 8 && s.down >= 2, up = -lead(s), t = left(s), o = s.poss;
  const passRate = (G.passes?.[o] || 0) / Math.max(4, (G.passes?.[o] || 0) + (G.runs?.[o] || 0));
  if (s.quarter === 4 && up > 0 && up <= 16 && t < 120 && 100 - s.ballOn > 25) return { cov: 'zone', blitz: false, prevent: true };
  const blitz = R.chance((s.down === 3 && s.toGo >= 5 ? 0.3 : 0.14) + (passRate - 0.55) * 0.3 + (s.toGo <= 2 ? 0.08 : 0));
  if (blitz) { G.blitzes ||= { home: 0, away: 0 }; G.blitzes[other(o)] += 1; }
  return { cov: R.chance((long ? 0.6 : 0.45) + (passRate - 0.55) * 0.3) ? 'zone' : 'man', blitz, prevent: false };
}
const other = (side) => (side === 'home' ? 'away' : 'home');

// After a touchdown: true = go for two. diff: the scoring team's lead right after the six points.
export function goForTwo(G, diff) {
  const s = G.s;
  if (s.ot >= 2) return true;
  if (s.quarter < 4) return false;
  return [-2, -5, -10, 1, 5, 12].includes(diff) || (diff === -8 && left(s) < 120);
}
// How many seconds run off before the next snap when the clock is moving.
export function tempo(G) {
  const { R, s } = G, up = lead(s), t = left(s);
  if ((s.quarter === 2 && s.clock < 70) || (s.quarter === 4 && up < 0 && t < 200)) return R.int(9, 14);       // hurry-up
  if ((s.quarter === 4 && up > 0 && t < 260) || (s.quarter >= 3 && up >= 17) || up >= 24) return R.int(36, 39);                                             // milking it
  return R.int(24, 32);
}
