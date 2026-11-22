// Onside kicks. The kicking team gets it back 7-10% of the time (a fresh roll in that range every kick, then nudged by
// ratings: the kicker's accuracy, the hands on each side, and on the kick-and-chase the kicker's speed). The score never
// changes the odds: it's luck and ratings. NFL rules: the kicking team can't touch it until it has gone 10 yards (the
// receiving team can touch it any time). If a kicker touches it short of 10 it's ILLEGAL TOUCHING (called here more often
// than in the NFL) and the receiving team takes it at that spot. When the receiving team gets it, the man who has it slides
// down, or gets tackled if a cover man is right on him: nobody tries to run one back.
// Eleven ways to kick it; the kicker's kick-and-chase (he pokes it straight ahead and races everyone to it) is called the
// least and works the most. Writes an 'onside' event for the animation (sceneOnside) and returns { side, ballOn, time }.
import { clamp, top, val, swing } from './simCore.js';
import { legRating as leg } from './kickMath.js';
import { addEvent } from './simReport.js';

// [key, what the call says, how often it's called, how well it works, how often a kicker jumps it early]
export const ONSIDE = [
  ['hop', 'the high hop', 3, 1, 1],
  ['dribble_r', 'a dribbler to the right', 2.4, 0.9, 1.1],
  ['dribble_l', 'a dribbler to the left', 2.4, 0.9, 1.1],
  ['topspin', 'a top-spin skipper', 2, 1.05, 1],
  ['squib', 'a squib up the middle', 1.4, 0.7, 0.8],
  ['pop', 'a pop-up over the front line', 1.2, 0.85, 0.6],
  ['curve_r', 'a hooking roller', 1.5, 0.95, 1.1],
  ['curve_l', 'a slicing roller', 1.5, 0.95, 1.1],
  ['overload', 'everybody stacked to one side', 1.2, 1.1, 1.2],
  ['fake', 'a fake one way and a kick the other', 0.8, 1.15, 1],
  ['chase', 'the kicker kick-and-chase', 0.35, 2.4, 1.9],
];
const W = ONSIDE.reduce((n, k) => n + k[2], 0), AVG = ONSIDE.reduce((n, k) => n + k[2] * k[3], 0) / W, AVG_ILL = ONSIDE.reduce((n, k) => n + k[2] * k[4], 0) / W;
const hands = (G, p) => top(G, p, ['catching', 'ball_skills', 'catch_traffic', 'play_rec'], 50);
const pickBy = (R, list, w) => { let x = R.r() * list.reduce((n, p) => n + w(p), 0); return list.find((p) => (x -= w(p)) < 0) || list[0]; };

// kicking: the side kicking it. from: its own yard line it kicks from (35, or 20 after a safety).
export function onsideKick(G, play, kicking, from = 35) {
  const { R } = G, rcv = kicking === 'home' ? 'away' : 'home', K = G.teams[kicking].kick.kickoff, H = G.teams[rcv].kick.kickReturn;
  const kicker = K.kicker, cover = K.players.filter((p) => p && p !== kicker), team = H.players.filter(Boolean);
  let x = R.r() * W; const [kind, label, , edge, ill] = ONSIDE.find((k) => (x -= k[2]) < 0) || ONSIDE[0];
  const myHands = Math.max(...cover.map((p) => hands(G, p))), theirHands = Math.max(...team.map((p) => hands(G, p)));
  const rate = clamp(1 + (leg(G, kicker, 'kick_accuracy') - 70) / 160 + (myHands - theirHands) / 220 + (kind === 'chase' ? (val(G, kicker, 'speed') - 62) / 90 : 0), 0.7, 1.35);
  const pGot = (0.07 + R.r() * 0.03) * (edge / AVG) * rate, pIll = 0.09 * (ill / AVG_ILL) * (kind === 'chase' ? clamp(1.3 - (val(G, kicker, 'speed') - 50) / 80, 0.7, 1.4) : 1);
  const roll = R.r(), got = roll < pGot, illegal = !got && roll < pGot + pIll;
  const reach = { hop: [10, 13], pop: [12, 16], squib: [9, 13], chase: [10, 11] }[kind] || [9, 14];
  const d = got ? (kind === 'chase' ? 10 + R.int(0, 1) : R.int(10, 13)) : illegal ? R.int(8, 9) : R.int(reach[0], reach[1]);
  const by = got ? (kind === 'chase' ? kicker : pickBy(R, cover, (p) => hands(G, p) ** 2)) : illegal ? (kind === 'chase' ? kicker : pickBy(R, cover, (p) => val(G, p, 'speed'))) : pickBy(R, team, (p) => hands(G, p) ** 2);
  const tackled = !got && !illegal && R.chance(0.4), adv = tackled ? R.int(0, 2) : 0;   // the receiving team: slides, or gets dropped right there
  const tackler = tackled ? pickBy(R, cover, (p) => val(G, p, 'speed')) : null;
  addEvent(play, 'onside', 0, { kind, d, got, illegal, by: by?.id, kicker: kicker?.id, tackled, tackler: tackler?.id, adv, lat: R.int(-8, 8) });
  play.kind = 'kickoff'; play.onside = kind;
  const who = (p) => `${p?.number != null ? `#${p.number} ` : ''}${p?.last || 'someone'}`;
  if (illegal) addEvent(play, 'flag', 1.6, { name: 'Illegal touching', on: by?.id, team: kicking, yards: 0, accepted: true, spotBall: true });
  if (illegal) { play.flagged = true; play.headline = 'FLAG'; }
  if (got) { play.headline = 'ONSIDE RECOVERED'; swing(G, kicking, 0.35); }
  play.text = got ? `Onside kick, ${label}... ${who(by)} comes up with it! The kicking team keeps the ball at the ${50 - Math.abs(50 - (from + d))}!`
    : illegal ? `Onside kick, ${label}... ${who(by)} touches it ${d} yards out, before it goes 10. FLAG: illegal touching. The receiving team takes over right there.`
      : `Onside kick, ${label}... ${who(by)} ${tackled ? 'secures it and is dropped' : 'secures it and slides down'}. No luck for the kicking team.`;
  const side = got ? kicking : rcv, ballOn = got ? from + d : 100 - (from + d) + adv;
  return { side, ballOn: clamp(ballOn, 1, 99), time: 3 };
}
