// Penalties and injuries. A few flags a game, in about the NFL's mix (Pro Football Reference, 2024: false starts and offensive
// holding the most, then defensive pass interference, defensive holding, delay of game, offside, offensive pass
// interference): before the snap false start, offside and delay of game; after it holding, OPI, DPI and defensive holding.
// (Injuries live in simInjury.js.)
import { addEvent } from './simReport.js';
import { clamp, val, stat } from './simCore.js';
import { bigHouse } from './stadiumPulse.js';

const LINE = ['OT1', 'OG1', 'C', 'OG2', 'OT2'];
// The lineman most likely to get flagged: low Discipline draws more.
const sloppy = (G, R) => LINE.map((k) => G.O[k]).sort((a, b) => (val(G, a, 'discipline', 60) + R.int(0, 40)) - (val(G, b, 'discipline', 60) + R.int(0, 40)))[0];

// Before the snap. Returns null, or { name, on (player), side, yards } after writing it into the report.
export function preSnapFlag(G, play) {
  const { R, s } = G, roll = R.r();
  if (owedFalseStart(G)) return crowdFalseStart(G, play);
  if (roll > 0.0145) return crowdFlag(G, play);
  if (roll >= 0.012) return delayOfGame(G, play, false);   // the play clock ran out on them
  const off = roll < 0.0095, p = off ? sloppy(G, R) : G.D[R.pick(['DE1', 'DE2', 'DT1', 'DT2', 'DL'])], side = off ? s.poss : G.defSide;
  const yards = off ? Math.min(5, Math.floor(s.ballOn / 2)) : Math.min(5, Math.floor((100 - s.ballOn) / 2)), name = off ? 'False start' : 'Offside';
  addEvent(play, 'flag', 0, { name, on: p.id, team: side, yards, accepted: true }); stat(play, p, 'pen'); stat(play, p, 'penyds', yards);
  play.kind = 'penalty'; play.headline = 'FLAG'; play.text = `FLAG: ${name} on ${p.last}, ${yards} yards.`;
  return { name, on: p, side, yards, off };
}

// A loud house rattles the visitors (Stadium Pulse): false starts and delay of game climb fast as it gets louder.
function delayOfGame(G, play, crowd) {   // on the offense, 5 yards; the play clock hits 0 on the broadcast
  const s = G.s, qb = G.O.QB, yards = Math.min(5, Math.floor(s.ballOn / 2));
  addEvent(play, 'flag', 0, { name: 'Delay of game', on: qb.id, team: s.poss, yards, accepted: true, crowd }); stat(play, qb, 'pen'); stat(play, qb, 'penyds', yards);
  play.kind = 'penalty'; play.headline = 'FLAG'; play.clock.playClockAtSnap = 0;
  play.text = crowd ? `FLAG: Delay of game on the offense, ${yards} yards. They couldn't hear the call over the crowd.` : `FLAG: Delay of game on the offense, ${yards} yards.`;
  if (crowd) { play.crowdHit = true; G.mom = Math.min(1, G.mom + 0.05); }
  return { name: 'Delay of game', on: qb, side: s.poss, yards, off: true };
}
const FS_RATE = 0.03;   // tuned so a sold-out house averages about one crowd false start a game
function crowdFlag(G, play) {
  const p = G.pul?.p || 0, { R, s } = G;
  if (p < 0.2) return null;
  const v = G.pul?.v || 0, full = (G.opts.crowd?.fill ?? 0.7) ** 6, r = R.r();   // a packed house rattles them far more than a half-empty one
  const fs = FS_RATE * p ** 0.4 * full * (v >= 88 ? 1.35 : v >= 72 ? 1.18 : 1), dog = 0.036 * p * p;   // DEAFENING and ELECTRIC: false starts come a bit easier
  if (r < fs) return crowdFalseStart(G, play);
  if (r < fs + dog) return delayOfGame(G, play, true);
  return null;
}
function crowdFalseStart(G, play) {
  const { R, s } = G, who = sloppy(G, R), name = 'False start', yards = Math.min(5, Math.floor(s.ballOn / 2));
  addEvent(play, 'flag', 0, { name, on: who.id, team: s.poss, yards, accepted: true, crowd: true }); stat(play, who, 'pen'); stat(play, who, 'penyds', yards);
  play.kind = 'penalty'; play.headline = 'FLAG'; play.crowdHit = true; G.mom = Math.min(1, G.mom + 0.05); G.crowdFS = (G.crowdFS || 0) + 1;   // the crowd caused it: momentum to the home team
  play.text = `FLAG: False start on ${who.last}, ${yards} yards. The crowd got to him!`;
  return { name, on: who, side: s.poss, yards, off: true };
}
// A sold-out house in one of the 7 biggest stadiums always gets one: if it hasn't happened yet, the odds on each visiting
// snap climb from the 2nd quarter on until it does (a sure thing by the last few minutes).
function owedFalseStart(G) {
  const s = G.s;
  if (!bigHouse(G.opts?.crowd) || G.crowdFS || s.poss !== 'away' || s.quarter < 2) return false;
  const late = s.quarter >= 5 || (s.quarter === 4 && s.clock <= 300), h = late ? (s.quarter === 4 && s.clock <= 150 ? 1 : 0.6) : [0, 0, 0.03, 0.08, 0.2][s.quarter];
  return G.R.r() < h;
}

// After a run or pass. May change the result: returns null, or { name, yards, off, auto1st } with the play's stats wiped.
export function postPlayFlag(G, play, res, call) {
  const { R, s } = G, clean = !res.turnover && !res.fumble?.lost;
  const wipe = (name, p, side, yards, extra) => {
    play.stats = []; play.noStats = false; stat(play, p, 'pen'); stat(play, p, 'penyds', yards);
    addEvent(play, 'flag', res.time || 3, { name, on: p.id, team: side, yards, accepted: true, ...extra });
    play.headline = 'FLAG'; play.text += ` FLAG: ${name} on ${p.last}, ${yards} yards.`; play.flagged = true;
    return { name, yards, ...extra };
  };
  if (clean && res.gain > 2 && R.chance(0.02)) { const yards = Math.min(10, Math.floor(s.ballOn / 2)); return wipe('Holding', sloppy(G, R), s.poss, yards, { off: true }); }
  const thrown = play.events.find((e) => e.type === 'throw');
  const tgt = play.events.find((e) => e.type === 'catch'), rec = Object.values(G.O).find((p) => p.id === tgt?.target), cov = Object.values(G.D).find((p) => p.id === tgt?.def);
  if (clean && thrown && thrown.air >= 8 && rec && R.chance(0.006)) return wipe('Offensive pass interference', rec, s.poss, Math.min(10, Math.floor(s.ballOn / 2)), { off: true });   // pushed off
  if (res.incomplete && thrown && thrown.air >= 8 && R.chance(0.048)) {
    return wipe('Defensive pass interference', cov || G.D.CB1, G.defSide, Math.min(thrown.air, 99 - s.ballOn), { off: false, auto1st: true });
  }
  if (thrown && (res.incomplete || res.gain < 5) && clean && R.chance(0.018)) return wipe('Defensive holding', cov || G.D.CB2 || G.D.CB1, G.defSide, Math.min(5, 99 - s.ballOn), { off: false, auto1st: true });   // declined when the play gained more
  return null;
}

