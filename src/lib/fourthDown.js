// Fourth down (and the end-of-half field goal): go for it, kick it, or punt. The coach weighs what each choice is worth in
// points (where the next possession starts and who has it), the chance his offense converts against this defense, and
// the kick odds for his own kicker. Then his personality and the score and clock move him off the math: underdogs and
// aggressive coaches go more, a team protecting a late lead plays it safe, a team that must score goes.
// The coach never knows how a play will turn out: only how confident he is. That comes from his players' ratings (the kicker's
// leg and accuracy), how his offense has been moving the ball today, and whether his kicker has already missed one today.
import { kickOdds, kickRange } from './simKicks.js';
import { working } from './coachPlan.js';

// Points a team can expect from having the ball at `yardLine` (its own 1 to the other 99).
export const ep = (yardLine) => -1 + 0.064 * Math.max(1, Math.min(99, yardLine));
// The chance an offense picks up `toGo` yards on one snap (a normal matchup), before team strength.
const CONVERT = [0, 0.68, 0.58, 0.52, 0.47, 0.43, 0.39, 0.36, 0.32, 0.3, 0.28];
export const convertOdds = (toGo, edge = 0) => Math.max(0.05, Math.min(0.9, (CONVERT[Math.min(10, toGo)] ?? 0.2) * (toGo > 10 ? 0.8 : 1) + edge * 0.08));

const secondsLeft = (s) => (s.ot ? 0 : (4 - s.quarter) * s.qlen + s.clock);
const leadOf = (s) => s.score[s.poss] - s.score[s.poss === 'home' ? 'away' : 'home'];

// Returns 'go' | 'fg' | 'punt'.
export function fourthDown(G) {
  const { s, R } = G, plan = G.teams[s.poss].plan || {}, oppPlan = G.teams[G.defSide].plan || {};
  const toGoal = 100 - s.ballOn, dist = toGoal + 17, up = leadOf(s), t = secondsLeft(s), late = s.quarter === 4 && !s.ot;
  const missed = G.plays.filter((p) => p.off === s.poss && (p.kind === 'fg' || p.kind === 'xp') && p.events.some((e) => e.type === 'kick' && e.good === false)).length;
  const canKick = dist <= kickRange(G, s.poss), pk = canKick ? kickOdds(G, s.poss, dist) * (missed ? 0.88 : 1) : 0;   // a kicker who's missed today gets less trust
  const moving = plan.report ? (working(plan, 'inside') + working(plan, 'short') + working(plan, 'quick') + working(plan, 'medium')) / 4 : 1;   // how today's offense is going
  const halfEnds = (s.quarter === 2 || late) && s.clock <= 12;
  if (s.ot) return canKick && pk > 0.55 && (up >= -3 && up <= 0) ? 'fg' : 'go';
  if (halfEnds) return canKick && pk > 0.12 && (!late || (up >= -3 && up <= 0) || up > 0) ? 'fg' : late && up < 0 ? 'go' : canKick ? 'fg' : 'punt';
  // must score: late and down more than a field goal, or down at all with almost no time
  const k = (s.qlen || 360) / 900;   // time windows are NFL minutes scaled to this league's quarter length
  if (late && up === -3 && canKick && pk > 0.5 && t < 480 * k && R.chance(0.55 + (plan.clutch ?? 0.6) * 0.4)) return 'fg';   // down 3 late with a makeable kick: tie it and take your chances
  if (late && ((up < -3 && t < 300 * k) || (up < 0 && t < 120 * k) || (up < -8 && t < 480 * k))) return canKick && up >= -3 && t < 40 ? 'fg' : 'go';
  const pc = Math.max(0.05, Math.min(0.92, convertOdds(s.toGo, ((plan.edge || 0) - (oppPlan.edge || 0)) / 2) * (0.75 + moving * 0.25)));   // rolling: more likely to trust it
  const go = pc * (ep(s.ballOn + s.toGo) + (s.ballOn + s.toGo >= 100 ? 2.5 : 0)) - (1 - pc) * ep(100 - s.ballOn);
  const fg = canKick ? pk * (3 - ep(25)) - (1 - pk) * ep(Math.max(20, 100 - (s.ballOn - 7))) : -9;
  const punt = toGoal < 38 ? -9 : -ep(Math.max(20, 100 - (s.ballOn + 38)));
  // real coaches are more careful than the math; personality, being the underdog, and the scoreboard move that
  let lean = -0.85 + (plan.aggression || 0) * 2;
  if (late && up > 0) lean -= up <= 8 ? 0.5 : 1;                       // protecting a late lead: don't hand them a short field
  if (late && up < 0) lean += 0.5;
  if (s.quarter === 4 && t < 600 * k && up >= 1 && up <= 3 && canKick) lean -= 0.3;   // a field goal makes it a two-score game
  lean += (R.r() - 0.5) * 0.5 * (1.3 - (plan.clutch ?? 0.6));          // a shakier coach is less consistent
  const best = Math.max(go + lean, fg, punt);
  return best === go + lean ? 'go' : best === fg ? 'fg' : 'punt';
}
