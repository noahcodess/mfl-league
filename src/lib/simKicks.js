// Kicking plays: college-style kickoffs (everybody runs, touchbacks to the 25), punts, field goals and extra points. Every
// team has the same league kicker and punter, so distance (and later weather) is what makes a kick hard.
import { addEvent } from './simReport.js';
import { clamp, mix, val, top, stat, swing } from './simCore.js';

const cover = (G, unit) => unit.players.slice(1).reduce((s, p) => s + mix(G, p, { speed: 0.4, tackling: 0.4, pursuit: 0.2 }, 45), 0) / Math.max(1, unit.players.length - 1);
const wall = (G, unit) => unit.players.slice(1).reduce((s, p) => s + mix(G, p, { run_block: 0.6, strength: 0.4 }, 45), 0) / Math.max(1, unit.players.length - 1);
const dash = (G, p) => top(G, p, ['elusiveness', 'run_after_catch', 'agility'], 50) * 0.5 + val(G, p, 'speed', 55) * 0.5;

// A return: the returner and his blockers against the coverage. base: the usual return in yards. Returns { yards, td }.
function runBack(G, play, ret, blockers, coverage, base, room) {
  const { R } = G, edge = (dash(G, ret) - 70) / 6 + (wall(G, blockers) - cover(G, coverage)) / 5;
  let yards = Math.round(base + edge + R.gauss(0, base * 0.35));
  if (R.chance(clamp(0.012 + edge * 0.004, 0.003, 0.05))) yards += R.int(25, 90);     // a seam opens
  yards = clamp(yards, 0, room);
  const tackler = R.pick(coverage.players.slice(1)); if (yards < room) stat(play, tackler, 'tkl');
  addEvent(play, 'ret', 4, { by: ret.id, yards, fair: false, touchback: false });
  return { yards, td: yards >= room, tackler };
}

// kicking: the side kicking off. from: 35, or 20 after a safety. Returns { ballOn (for the receiving team), td, time }.
export function kickoff(G, play, kicking, from = 35) {
  const { R } = G, K = G.teams[kicking].kick, Rcv = G.teams[kicking === 'home' ? 'away' : 'home'].kick, ret = Rcv.kickReturn.returner;
  play.kind = 'kickoff'; addEvent(play, 'kick', 0, { kind: 'kickoff', by: K.kickoff.kicker.id, dist: 100 - from });
  if (from === 35 && R.chance(0.42)) { play.text = 'Kickoff through the end zone. Touchback, ball at the 25.'; return { ballOn: 25, time: 0 }; }
  const land = clamp(Math.round(R.gauss(from === 35 ? 3 : 22, 5)), 0, 40), out = runBack(G, play, ret, Rcv.kickReturn, K.kickoff, 21, 100 - land);
  stat(play, ret, 'kr'); stat(play, ret, 'kryds', out.yards); if (out.td) { stat(play, ret, 'krtd'); swing(G, ret.side, 0.3); }
  play.text = out.td ? `${ret.last} takes the kickoff... ALL THE WAY! TOUCHDOWN!` : `${ret.last} returns the kickoff ${out.yards} yards to the ${land + out.yards}.`;
  if (out.td) play.headline = 'KICK RETURN TD';
  return { ballOn: land + out.yards, td: out.td, time: 5 + out.yards / 8 };
}

// Returns { ballOn (for the receiving team), td, time }.
export function punt(G, play) {
  const { R, s } = G, me = G.teams[s.poss].kick, them = G.teams[G.defSide].kick, P = me.punt.punter, ret = them.puntReturn.returner, toGoal = 100 - s.ballOn;
  const gross = Math.min(toGoal + 8, Math.round(R.gauss(44, 5))), spot = s.ballOn + gross;   // spot: where it comes down, from the punting side
  play.kind = 'punt'; stat(play, P, 'punts'); stat(play, P, 'puntyds', Math.min(gross, toGoal)); addEvent(play, 'kick', 1.3, { kind: 'punt', by: P.id, dist: gross, hang: 4.2 });
  if (spot >= 100) { play.text = `Punt of ${gross} into the end zone. Touchback.`; return { ballOn: 20, time: 6 }; }
  if (R.chance(spot > 88 ? 0.6 : 0.33)) { addEvent(play, 'ret', 5.5, { by: ret.id, yards: 0, fair: true }); play.text = `Punt of ${gross}. Fair catch by ${ret.last} at the ${100 - spot}.`; return { ballOn: 100 - spot, time: 6 }; }
  const out = runBack(G, play, ret, them.puntReturn, me.punt, 8, spot);
  stat(play, ret, 'pr'); stat(play, ret, 'pryds', out.yards); if (out.td) { stat(play, ret, 'prtd'); swing(G, ret.side, 0.3); play.headline = 'PUNT RETURN TD'; }
  play.text = out.td ? `Punt of ${gross}. ${ret.last} takes it back... TOUCHDOWN!` : `Punt of ${gross}. ${ret.last} returns it ${out.yards}.`;
  return { ballOn: 100 - spot + out.yards, td: out.td, time: 7 + out.yards / 8 };
}

// The chance a kick is good from `dist` yards. Everyone has the same leg for now.
export const fgOdds = (dist) => clamp(1.02 - Math.max(0, (dist - 20) / 46) ** 2.4, 0.02, 0.99);
export function fieldGoal(G, play) {
  const { R, s } = G, K = G.teams[s.poss].kick.fieldGoal.kicker, dist = 100 - s.ballOn + 17, good = R.chance(fgOdds(dist));
  play.kind = 'fg'; stat(play, K, 'fga'); if (good) { stat(play, K, 'fgm'); stat(play, K, 'fglong', dist); }
  addEvent(play, 'kick', 1.2, { kind: 'fg', by: K.id, dist, good });
  play.text = good ? `The ${dist}-yard field goal is GOOD.` : `The ${dist}-yard field goal is NO GOOD.`; play.headline = good ? 'FIELD GOAL' : 'NO GOOD';
  swing(G, s.poss, good ? 0.06 : -0.12);
  return { good, time: 5 };
}
export function extraPoint(G, play, side) {
  const K = G.teams[side].kick.fieldGoal.kicker, good = G.R.chance(0.95);
  play.kind = 'xp'; stat(play, K, 'xpa'); if (good) stat(play, K, 'xpm');
  addEvent(play, 'kick', 1.2, { kind: 'xp', by: K.id, dist: 33, good });
  play.text = good ? 'The extra point is good.' : 'The extra point is NO GOOD!';
  return { good };
}
