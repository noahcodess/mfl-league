// The offensive play caller: run or pass and how deep, every snap. It starts from what real teams do on each down and
// distance (run about half the time on 1st and 10, throw on 3rd and long), then leans: his scheme (a little), his players
// (more: skills outweigh the playbook), his personality, what's been working today, the score and the clock (two-minute
// drill, killing clock, way behind), and a hot or cold quarterback. Fourth downs go to fourthDown, the play to pickPlay.
import { pickPlay } from './simPlaybook.js';
import { fourthDown } from './fourthDown.js';
import { working } from './coachPlan.js';
import { SCHEME_LEAN } from './playbookFormations.js';
import { clockGoal } from './simClock.js';

const secondsLeft = (s) => (s.ot ? 0 : (4 - s.quarter) * s.qlen + s.clock);
const leadOf = (s) => s.score[s.poss] - s.score[s.poss === 'home' ? 'away' : 'home'];
const pickW = (R, w) => { const sum = Object.values(w).reduce((a, b) => a + b, 0); let r = R.r() * sum; for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) return k; } return Object.keys(w)[0]; };

// Returns a call: { type: 'run' | 'pass' | 'punt' | 'fg' | 'kneel' | 'spike', ... }.
export function offenseCall(G) {
  const { s } = G, up = leadOf(s), late = s.quarter === 4 && !s.ot, to = s.to[G.defSide];
  // victory formation: up late and the other side can't stop the clock enough to get it back
  if (late && up > 0 && s.down < 4 && s.clock < 40 * (4 - s.down) - 10 * to) return { type: 'kneel' };
  if (s.quarter === 2 && up >= 0 && s.clock < 30 && s.ballOn < 40 && s.down < 4) return { type: 'kneel' };   // nothing to gain before half
  if (late && up === 0 && s.clock < 25 && s.ballOn < 35 && s.down < 4 && !s.ot) return { type: 'kneel' };      // tied, deep in his own end: take it to overtime
  if (G.spikeNow) { G.spikeNow = false; return { type: 'spike' }; }
  if (s.down === 4) {
    const d = fourthDown(G);
    if (d === 'fg') return { type: 'fg' };
    if (d === 'punt') return { type: 'punt' };
    return play(G, true);
  }
  // last snap of a half in field goal range: kick it now
  if ((s.quarter === 2 || late) && s.clock <= 6 && !s.running && 100 - s.ballOn + 17 <= 55 && (s.quarter === 2 || (up >= -3 && up <= 0))) return { type: 'fg' };
  return play(G, false);
}

function play(G, must) {
  const { R, s } = G, side = s.poss, plan = G.teams[side].plan || { off: 'balanced', run: 0, risk: 0, sharp: 1, report: { fam: {} } };
  const up = leadOf(s), t = secondsLeft(s), toGoal = 100 - s.ballOn, late = s.quarter === 4 && !s.ot;
  const goal = clockGoal(G), hurry = goal === 'stop', clock = goal === 'run' && up < 24;   // same clock plan as the tempo and the runners
  const ctx = { short: s.toGo <= 2, red: toGoal <= 20, goal: toGoal <= 4, clock, hurry, long: s.toGo >= 8 && s.down >= 3,
    hail: (s.quarter === 2 || late) && s.clock <= 5 && toGoal > 35 && toGoal < 65 && (s.quarter === 2 || up < 0) };
  if (ctx.hail) return pickPlay(G, 'pass', 'deep', ctx);
  // where real offenses start: chance of a pass by down and distance
  let pass = s.down === 1 ? (s.toGo > 10 ? 0.58 : ctx.goal ? 0.4 : 0.43)
    : s.toGo <= 1 ? 0.3 : s.toGo <= 3 ? (s.down === 2 ? 0.38 : 0.5) : s.toGo <= 6 ? (s.down === 2 ? 0.55 : 0.75) : s.down === 2 ? 0.68 : 0.88;
  // the leans, added up and capped so no team turns into a pure passing or pure running team on normal downs
  const runWorks = (working(plan, 'inside') + working(plan, 'outside')) / 2, passWorks = (working(plan, 'short') + working(plan, 'medium') + working(plan, 'quick')) / 3;
  const lean = (SCHEME_LEAN[plan.off]?.pass || 0) - (plan.run || 0)                     // scheme and personality (small)
    + (G.O.passEdge || 0)                                                              // what his players do best (bigger)
    + Math.max(-0.06, Math.min(0.06, (passWorks - runWorks) * 0.2))                    // keep doing what's working
    + (hurry ? 0 : Math.max(-0.05, Math.min(0.05, (G.hot?.[side] || 0) * 0.015)));     // a hot quarterback keeps throwing
  pass += Math.max(-0.16, Math.min(0.16, lean));
  if (hurry) pass = Math.max(pass, 0.85);
  // the last minute of a half, or needing a touchdown late: throw it. A run only makes sense when a field goal is all
  // he needs and he's already in range (set it up in the middle), never 70 yards away with the clock running out.
  const halfLeft = s.quarter === 2 || late ? s.clock : 999, fgDist = 100 - s.ballOn + 17, needTd = late && up < -3 && up >= -8 && t < 150;
  const fgEnough = s.quarter === 2 || (late && up >= -3 && up <= 0), inRange = fgDist <= 50;
  if ((hurry && halfLeft < 60 && !(fgEnough && inRange)) || needTd) pass = 1;
  else if (clock) pass -= late && t < 150 ? 0.4 : 0.25;                           // protect the lead: run, stay in bounds
  else if (up <= -14 && s.quarter >= 3) pass += 0.15;
  if (up >= 24) pass = Math.min(pass, 0.25);                                      // way ahead: run it and get out of here
  if (must && s.toGo >= 4) pass = Math.max(pass, 0.8);
  if (pass >= 1) return pickPlay(G, 'pass', depth(G, plan, ctx, must, up, t), ctx);
  if (ctx.short && !hurry && s.toGo <= 1 && R.chance(0.16)) return pickPlay(G, 'run', 'sneak', ctx);
  if (!R.chance(Math.max(0.08, Math.min(0.95, pass)))) return pickPlay(G, 'run', 'any', ctx);
  return pickPlay(G, 'pass', depth(G, plan, ctx, must, up, t), ctx);
}

// How deep to throw: what the yardage asks for, then his scheme's taste, his risk appetite, momentum, and what's working.
function depth(G, plan, ctx, must, up, t) {
  const { R, s } = G, need = must ? s.toGo : s.toGo * 0.8, roomDeep = 100 - s.ballOn > 22, mine = G.mom * (s.poss === 'home' ? 1 : -1);
  const w = need > 12 ? { quick: 0.2, short: 0.6, medium: 2, deep: 1.6 } : need > 6 ? { quick: 0.6, short: 1.4, medium: 2, deep: 0.6 }
    : need > 3 ? { quick: 1.4, short: 2, medium: 1.1, deep: 0.35 } : { quick: 2.2, short: 1.8, medium: 0.6, deep: 0.3 };
  if (s.down === 2 && s.toGo <= 3) w.deep *= 2.2;                                 // 2nd and short: the shot play
  if (ctx.hurry && t < 40 && roomDeep) { w.deep *= 1.6; w.medium *= 1.3; }
  if (ctx.clock) { w.deep *= 0.4; w.quick *= 1.4; }
  const lean = SCHEME_LEAN[plan.off]?.depth || {};
  for (const k of Object.keys(w)) w[k] *= (lean[k] || 1) * working(plan, k);
  w.deep *= Math.exp((plan.risk || 0) * 1.5 + Math.max(0, mine) * 0.4) * (up < -10 ? 1.4 : 1);
  if (!roomDeep) { w.deep = 0; w.medium *= 0.6; }
  return pickW(R, w);
}

// After a touchdown: true = go for two. diff: the scoring team's lead right after the six points.
export function goForTwo(G, diff) {
  const s = G.s, plan = G.teams[s.patSide || s.poss]?.plan || {};
  if (s.ot >= 2) return true;
  if (s.quarter < 4) return (plan.aggression || 0) > 0.2 && G.R.chance(0.05);
  return [-2, -5, -10, 1, 5, 12].includes(diff) || (diff === -8 && s.clock < 120) || ((plan.aggression || 0) > 0.15 && diff === -1 && s.clock < 60);
}
