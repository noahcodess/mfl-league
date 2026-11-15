// Kicking plays: college-style kickoffs (everybody runs, touchbacks to the 25), punts, field goals and extra points, all by
// the team's kicker. Kick Power = distance and touchbacks, Kick Accuracy = makes, Punt Power = hang and distance, Punt
// Accuracy = pinning it deep and no shanks, Tackling + Speed = the kicker saving a return touchdown. 72 is a 3.5-star leg.
import { addEvent } from './simReport.js';
import { clamp, mix, val, top, stat, swing } from './simCore.js';

const AVG = 72;
const leg = (G, K, key) => val(G, K, key, 30);   // a non-kicker reads as 30 on every kicking bar
export const kickerOf = (G, side) => G.teams[side].kick.fieldGoal.kicker;
// How far this kicker will try a field goal from (a 3.5-star leg: about 52 yards; the best: about 60).
export const kickRange = (G, side) => Math.min(62, Math.round(52 + (leg(G, kickerOf(G, side), 'kick_power') - AVG) * 0.8));

const cover = (G, unit) => unit.players.slice(1).reduce((s, p) => s + mix(G, p, { speed: 0.4, tackling: 0.4, pursuit: 0.2 }, 45), 0) / Math.max(1, unit.players.length - 1);
const wall = (G, unit) => unit.players.slice(1).reduce((s, p) => s + mix(G, p, { run_block: 0.6, strength: 0.4 }, 45), 0) / Math.max(1, unit.players.length - 1);
const dash = (G, p) => top(G, p, ['elusiveness', 'run_after_catch', 'agility'], 50) * 0.5 + val(G, p, 'speed', 55) * 0.5;

// A return: the returner and his blockers against the coverage. base: the usual return in yards. Returns { yards, td }.
function runBack(G, play, ret, blockers, coverage, base, room) {
  const { R } = G, edge = (dash(G, ret) - 70) / 6 + (wall(G, blockers) - cover(G, coverage)) / 5;
  let yards = Math.round(base + edge + R.gauss(0, base * 0.35));
  if (R.chance(clamp(0.012 + edge * 0.004, 0.003, 0.05))) yards += R.int(25, 90);     // a seam opens
  yards = clamp(yards, 0, room);
  let tackler = R.pick(coverage.players.slice(1)), saved = false;
  const K = coverage.kicker || coverage.punter;
  if (K && (yards >= room || yards >= 35) && R.chance(clamp(0.12 + (mix(G, K, { tackling: 0.6, speed: 0.4 }, 30) - 50) * 0.008, 0.03, 0.35))) {
    yards = clamp(Math.round(yards * (0.55 + R.r() * 0.3)), 0, room - 1); tackler = K; saved = true;   // the last man back makes the stop
  }
  if (yards < room) stat(play, tackler, 'tkl');
  addEvent(play, 'ret', 4, { by: ret.id, yards, fair: false, touchback: false, tackler: yards < room ? tackler.id : null, kickerSave: saved });
  return { yards, td: yards >= room, tackler, saved };
}

// kicking: the side kicking off. from: 35, or 20 after a safety. Returns { ballOn (for the receiving team), td, time }.
export function kickoff(G, play, kicking, from = 35) {
  const { R } = G, K = G.teams[kicking].kick, Rcv = G.teams[kicking === 'home' ? 'away' : 'home'].kick, ret = Rcv.kickReturn.returner;
  const kicker = K.kickoff.kicker, kp = leg(G, kicker, 'kick_power'), ka = leg(G, kicker, 'kick_accuracy');
  const oob = R.chance(clamp(0.02 + (66 - ka) * 0.004, 0.004, 0.12));
  play.kind = 'kickoff'; addEvent(play, 'kick', 0, { kind: 'kickoff', by: kicker?.id, dist: 100 - from, oob });
  if (oob) {
    play.text = `${kicker?.last || 'The kick'} sends it out of bounds. Ball at the 40.`; return { ballOn: 40, time: 0 };
  }
  if (from === 35 && R.chance(clamp(0.42 + (kp - AVG) * 0.025, 0.04, 0.8))) { play.text = 'Kickoff through the end zone. Touchback, ball at the 25.'; return { ballOn: 25, time: 0 }; }
  const land = clamp(Math.round(R.gauss(from === 35 ? 3 + (AVG - kp) * 0.35 : 22, 5)), 0, 40), out = runBack(G, play, ret, Rcv.kickReturn, K.kickoff, 21, 100 - land);
  stat(play, ret, 'kr'); stat(play, ret, 'kryds', out.yards); if (out.td) { stat(play, ret, 'krtd'); swing(G, ret.side, 0.3); }
  play.text = out.td ? `${ret.last} takes the kickoff... ALL THE WAY! TOUCHDOWN!` : `${ret.last} returns the kickoff ${out.yards} yards to the ${land + out.yards}.${out.saved ? ` The kicker ${out.tackler.last} saves a touchdown!` : ''}`;
  if (out.td) play.headline = 'KICK RETURN TD';
  return { ballOn: land + out.yards, td: out.td, time: 5 + out.yards / 8 };
}

// Returns { ballOn (for the receiving team), td, time }.
export function punt(G, play) {
  const { R, s } = G, me = G.teams[s.poss].kick, them = G.teams[G.defSide].kick, P = me.punt.punter, ret = them.puntReturn.returner, toGoal = 100 - s.ballOn;
  const pp = leg(G, P, 'punt_power'), pa = leg(G, P, 'punt_accuracy'), shank = R.chance(clamp(0.03 + (68 - pa) * 0.004, 0.004, 0.14));
  let gross = Math.min(toGoal + 8, Math.round(R.gauss(44 + (pp - AVG) * 0.35, 4.5) * (shank ? 0.55 : 1))), spot = s.ballOn + gross;   // spot: where it comes down, from the punting side
  const pinned = spot >= 100 && !shank && R.chance(clamp(0.25 + (pa - AVG) * 0.02, 0.04, 0.6));
  if (pinned) { spot = 100 - R.int(3, 12); gross = spot - s.ballOn; }
  const hang = clamp(4.2 + (pp - AVG) * 0.03, 3.2, 5) * (shank ? 0.6 : 1);
  play.kind = 'punt'; stat(play, P, 'punts'); stat(play, P, 'puntyds', Math.min(gross, toGoal)); addEvent(play, 'kick', 1.3, { kind: 'punt', by: P.id, dist: gross, hang, shank });
  if (pinned) { stat(play, P, 'in20'); play.text = `Beautiful punt by ${P.last}, downed at the ${100 - spot}.`; return { ballOn: 100 - spot, time: 6 }; }
  if (spot >= 100) { play.text = `Punt of ${gross} into the end zone. Touchback.`; return { ballOn: 20, time: 6 }; }
  if (shank) { play.text = `${P.last} shanks it! Only ${gross} yards, out of bounds at the ${spot > 50 ? 100 - spot : spot}.`; return { ballOn: 100 - spot, time: 4 }; }
  if (R.chance(spot > 88 ? 0.6 : 0.33)) { addEvent(play, 'ret', 5.5, { by: ret.id, yards: 0, fair: true }); play.text = `Punt of ${gross}. Fair catch by ${ret.last} at the ${100 - spot}.`; return { ballOn: 100 - spot, time: 6 }; }
  const out = runBack(G, play, ret, them.puntReturn, me.punt, clamp(8 - (pa - AVG) * 0.08, 4, 11), spot);
  if (100 - spot <= 20) stat(play, P, 'in20');
  stat(play, ret, 'pr'); stat(play, ret, 'pryds', out.yards); if (out.td) { stat(play, ret, 'prtd'); swing(G, ret.side, 0.3); play.headline = 'PUNT RETURN TD'; }
  play.text = out.td ? `Punt of ${gross}. ${ret.last} takes it back... TOUCHDOWN!` : `Punt of ${gross}. ${ret.last} returns it ${out.yards}.`;
  return { ballOn: 100 - spot + out.yards, td: out.td, time: 7 + out.yards / 8 };
}

// The chance a kick is good from `dist` yards: Kick Power sets how far his leg carries, Kick Accuracy takes away from it.
export const fgOdds = (dist, kp = AVG, ka = AVG) =>
  clamp(1.02 - Math.max(0, (dist - 20) / (46 + (kp - AVG) * 0.45)) ** 2.4 - (AVG - ka) * 0.006 * (dist >= 40 ? 1.4 : 1), 0.02, 0.99);
export const kickOdds = (G, side, dist) => { const K = kickerOf(G, side); return fgOdds(dist, leg(G, K, 'kick_power'), leg(G, K, 'kick_accuracy')); };
export function fieldGoal(G, play) {
  const { R, s } = G, K = kickerOf(G, s.poss), dist = 100 - s.ballOn + 17, good = R.chance(kickOdds(G, s.poss, dist));
  play.kind = 'fg'; stat(play, K, 'fga'); if (good) { stat(play, K, 'fgm'); stat(play, K, 'fglong', dist); }
  addEvent(play, 'kick', 1.2, { kind: 'fg', by: K.id, dist, good });
  play.text = good ? `The ${dist}-yard field goal is GOOD.` : `The ${dist}-yard field goal is NO GOOD.`; play.headline = good ? 'FIELD GOAL' : 'NO GOOD';
  swing(G, s.poss, good ? 0.06 : -0.12);
  return { good, time: 5 };
}
export function extraPoint(G, play, side) {
  const K = kickerOf(G, side), good = G.R.chance(clamp(0.95 + (leg(G, K, 'kick_accuracy') - AVG) * 0.006, 0.7, 0.995));
  play.kind = 'xp'; stat(play, K, 'xpa'); if (good) stat(play, K, 'xpm');
  addEvent(play, 'kick', 1.2, { kind: 'xp', by: K.id, dist: 33, good });
  play.text = good ? 'The extra point is good.' : 'The extra point is NO GOOD!';
  return { good };
}
