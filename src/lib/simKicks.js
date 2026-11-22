// Kicking plays: college-style kickoffs (everybody runs, touchbacks to the 25), punts, field goals and extra points, all by
// the team's kicker. The numbers behind every kick (range, makes, touchbacks, punt distance, shanks) live in kickMath.
// Tackling + Speed = the kicker saving a return touchdown.
import { addEvent } from './simReport.js';
import { clamp, mix, val, top, stat, swing } from './simCore.js';
import { legRating as leg, longest, makeOdds, touchbackOdds, kickoffOobOdds, puntDistance, puntHang, shankOdds, pinOdds } from './kickMath.js';

export const kickerOf = (G, side) => G.teams[side].kick.fieldGoal.kicker;
// The longest field goal this kicker would ever try (his comfortable range plus a couple of yards on a must-have kick).
export const kickRange = (G, side) => Math.min(68, Math.floor(longest(leg(G, kickerOf(G, side), 'kick_power')) + 2));

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
  const oob = R.chance(kickoffOobOdds(ka));
  play.kind = 'kickoff'; addEvent(play, 'kick', 0, { kind: 'kickoff', by: kicker?.id, dist: 100 - from, oob });
  if (oob) {
    play.text = `${kicker?.last || 'The kick'} sends it out of bounds. Ball at the 40.`; return { ballOn: 40, time: 0 };
  }
  if (from === 35 && R.chance(touchbackOdds(kp))) { play.text = 'Kickoff through the end zone. Touchback, ball at the 25.'; return { ballOn: 25, time: 0 }; }
  const land = clamp(Math.round(R.gauss(from === 35 ? 2 + (75 - kp) * 0.25 : 22, 5)), 0, 40), out = runBack(G, play, ret, Rcv.kickReturn, K.kickoff, 21, 100 - land);
  stat(play, ret, 'kr'); stat(play, ret, 'kryds', out.yards); if (out.td) { stat(play, ret, 'krtd'); swing(G, ret.side, 0.3); }
  play.text = out.td ? `${ret.last} takes the kickoff... ALL THE WAY! TOUCHDOWN!` : `${ret.last} returns the kickoff ${out.yards} yards to the ${land + out.yards}.${out.saved ? ` The kicker ${out.tackler.last} saves a touchdown!` : ''}`;
  if (out.td) play.headline = 'KICK RETURN TD';
  return { ballOn: land + out.yards, td: out.td, time: 5 + out.yards / 8 };
}

// Returns { ballOn (for the receiving team), td, time }.
export function punt(G, play) {
  const { R, s } = G, me = G.teams[s.poss].kick, them = G.teams[G.defSide].kick, P = me.punt.punter, ret = them.puntReturn.returner, toGoal = 100 - s.ballOn;
  const pp = leg(G, P, 'punt_power'), pa = leg(G, P, 'punt_accuracy'), shank = R.chance(shankOdds(pa));
  let gross = Math.min(toGoal + 8, Math.round(R.gauss(puntDistance(pp), 4.5) * (shank ? 0.55 : 1))), spot = s.ballOn + gross;   // spot: where it comes down, from the punting side
  const pinned = spot >= 100 && !shank && R.chance(pinOdds(pa));
  if (pinned) { spot = 100 - R.int(3, 12); gross = spot - s.ballOn; }
  const hang = puntHang(pp) * (shank ? 0.6 : 1);
  play.kind = 'punt'; stat(play, P, 'punts'); stat(play, P, 'puntyds', Math.min(gross, toGoal)); addEvent(play, 'kick', 1.3, { kind: 'punt', by: P.id, dist: gross, hang, shank });
  if (pinned) { stat(play, P, 'in20'); play.text = `Beautiful punt by ${P.last}, downed at the ${100 - spot}.`; return { ballOn: 100 - spot, time: 6 }; }
  if (spot >= 100) { play.text = `Punt of ${gross} into the end zone. Touchback.`; return { ballOn: 20, time: 6 }; }
  if (shank) { play.text = `${P.last} shanks it! Only ${gross} yards, out of bounds at the ${spot > 50 ? 100 - spot : spot}.`; return { ballOn: 100 - spot, time: 4 }; }
  if (R.chance(spot > 88 ? 0.6 : 0.33)) { addEvent(play, 'ret', 5.5, { by: ret.id, yards: 0, fair: true }); play.text = `Punt of ${gross}. Fair catch by ${ret.last} at the ${100 - spot}.`; return { ballOn: 100 - spot, time: 6 }; }
  const out = runBack(G, play, ret, them.puntReturn, me.punt, clamp(8 - (pa - 75) * 0.08, 4, 11), spot);
  if (100 - spot <= 20) stat(play, P, 'in20');
  stat(play, ret, 'pr'); stat(play, ret, 'pryds', out.yards); if (out.td) { stat(play, ret, 'prtd'); swing(G, ret.side, 0.3); play.headline = 'PUNT RETURN TD'; }
  play.text = out.td ? `Punt of ${gross}. ${ret.last} takes it back... TOUCHDOWN!` : `Punt of ${gross}. ${ret.last} returns it ${out.yards}.`;
  return { ballOn: 100 - spot + out.yards, td: out.td, time: 7 + out.yards / 8 };
}

// The chance a field goal from `dist` yards is good for this side's kicker today.
export const kickOdds = (G, side, dist) => { const K = kickerOf(G, side); return makeOdds(dist, leg(G, K, 'kick_power'), leg(G, K, 'kick_accuracy')); };
export function fieldGoal(G, play) {
  const { R, s } = G, K = kickerOf(G, s.poss), dist = 100 - s.ballOn + 17, good = R.chance(kickOdds(G, s.poss, dist) * (1 - 0.05 * (G.pul?.p || 0)));   // a visiting kicker in a loud house
  play.kind = 'fg'; stat(play, K, 'fga'); if (good) { stat(play, K, 'fgm'); stat(play, K, 'fglong', dist); }
  addEvent(play, 'kick', 1.2, { kind: 'fg', by: K.id, dist, good });
  play.text = good ? `The ${dist}-yard field goal is GOOD.` : `The ${dist}-yard field goal is NO GOOD.`; play.headline = good ? 'FIELD GOAL' : 'NO GOOD';
  swing(G, s.poss, good ? 0.06 : -0.12);
  return { good, time: 5 };
}
export function extraPoint(G, play, side) {
  const K = kickerOf(G, side), good = G.R.chance(kickOdds(G, side, 33));
  play.kind = 'xp'; stat(play, K, 'xpa'); if (good) stat(play, K, 'xpm');
  addEvent(play, 'kick', 1.2, { kind: 'xp', by: K.id, dist: 33, good });
  play.text = good ? 'The extra point is good.' : 'The extra point is NO GOOD!';
  return { good };
}
