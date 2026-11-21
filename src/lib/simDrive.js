// One snap at a time: runs a scrimmage play, a kickoff or the try after a touchdown, then settles what it did to the game
// (yards, downs, points, who has the ball, the clock). Regulation and overtime both run on these.
import { newPlay } from './simReport.js';
import { clamp, other, stat, swing } from './simCore.js';
import { runPlay } from './simRun.js';
import { passPlay } from './simPass.js';
import { kickoff, punt, fieldGoal, extraPoint } from './simKicks.js';
import { offenseCall, goForTwo } from './simCalls.js';
import { defenseCall } from './defenseBrain.js';
import { remember, pickPlay } from './simPlaybook.js';
import { scout } from './coachPlan.js';
import { preSnapFlag, postPlayFlag } from './simFlags.js';

export function sides(G) { const s = G.s; G.defSide = other(s.poss); G.O = G.teams[s.poss].O; G.D = G.teams[G.defSide].D; }
const start = (G) => { const p = newPlay({ ...G.s, hash: 'middle' }, G.plays.length + 1); p.stats = []; return p; };
function log(G, play, secs) {
  const s = G.s, was = s.clock; play.clock.seconds = s.ot ? 0 : Math.min(Math.round(secs), s.clock);
  if (!s.ot) s.clock -= play.clock.seconds;
  if (!s.ot && (s.quarter === 2 || s.quarter === 4) && was > 120 && s.clock <= 120) { s.running = false; play.twoMinute = true; }   // two-minute warning
  play.after = { score: { ...s.score }, poss: s.poss, ballOn: s.ballOn, down: s.down, toGo: s.toGo, quarter: s.quarter, clock: s.clock, mom: Math.round(G.mom * 100) / 100 };
  G.mom *= 0.97; G.plays.push(play);
  const lead = s.score.home - s.score.away;   // a one-score game late: the trailing side finds a little extra (the rally)
  if (s.quarter === 4 && !s.ot && s.clock < (s.qlen || 360) * 0.5 && lead !== 0 && Math.abs(lead) <= 8) swing(G, lead > 0 ? 'away' : 'home', 0.02);
  return play;
}
export function score(G, play, side, pts, how) {
  G.s.score[side] += pts; play.result.points = { side, pts, how }; G.scoring.push({ n: G.plays.length + 1, side, pts, how, quarter: G.s.quarter, clock: G.s.clock });
  swing(G, side, pts >= 6 ? 0.25 : 0.08);
}
// A key play: a fourth down that isn't an obvious punt, or a big down late in a close game.
export function isKeyPlay(G) {
  const s = G.s, close = Math.abs(s.score.home - s.score.away) <= 8, late = s.ot > 0 || (s.quarter === 4 && s.clock < 180);
  return (s.down === 4 && (s.toGo <= 3 || s.ballOn >= 55)) || (close && late && s.down >= 3) || (close && s.ballOn >= 95 && s.down >= 3);
}
const give = (G, side, ballOn) => { const s = G.s; s.poss = side; s.ballOn = clamp(Math.round(ballOn), 1, 99); s.down = 1; s.toGo = Math.min(10, 100 - s.ballOn); s.running = false; s.phase = 'play'; };

export function doKickoff(G) {
  const s = G.s, play = start(G), rcv = other(s.kicker); play.off = s.kicker; play.def = rcv;
  const behind = s.score[rcv] - s.score[s.kicker];   // onside kicks: only when losing, and only tried late when it's the last hope
  if (!s.freeKick && behind > 0 && behind <= 16 && s.quarter === 4 && s.clock < 150) {
    const got = G.R.chance(0.12); play.kind = 'kickoff'; play.onside = true; play.headline = got ? 'ONSIDE RECOVERED' : null;
    play.text = got ? `ONSIDE KICK... recovered by the kicking team!` : 'Onside kick... recovered by the receiving team.';
    if (got) swing(G, s.kicker, 0.3); give(G, got ? s.kicker : rcv, got ? 46 : 54); return log(G, play, 3);
  }
  const out = kickoff(G, play, s.kicker, s.freeKick ? 20 : 35); s.freeKick = false;
  if (out.td) { score(G, play, rcv, 6, 'kick return'); play.result.td = true; s.poss = rcv; s.phase = 'pat'; s.patSide = rcv; } else give(G, rcv, out.ballOn);
  return log(G, play, out.time);
}

// A two-point try from the 3. Returns true if it's good.
// A run or catch that reached the end zone on the spot math (not a called touchdown): credit the scorer (and the passer).
function creditTd(play) {
  if (play.noStats) return;
  const id = (k) => play.stats.find(([, key]) => key === k)?.[0], rec = id('rec'), car = id('car'), qb = id('cmp');
  if (rec) { play.stats.push([rec, 'rectd', 1]); if (qb) play.stats.push([qb, 'ptd', 1]); } else if (car) play.stats.push([car, 'rtd', 1]);
}

export function twoPoint(G, side) {
  const s = G.s; s.poss = side; s.ballOn = 97; s.down = 1; s.toGo = 3; sides(G);
  const play = start(G); play.noStats = true;
  const ctx = { short: true, red: true, goal: true }, call = G.R.chance(0.55) ? pickPlay(G, 'pass', G.R.chance(0.6) ? 'quick' : 'short', ctx) : pickPlay(G, 'run', 'any', ctx), def = defenseCall(G, call);
  play.call = call; play.defCall = def;
  const res = call.type === 'pass' ? passPlay(G, play, call.sub, def, call) : runPlay(G, play, call.sub, call, def);
  const good = !res.turnover && !res.fumble?.lost && !res.incomplete && (res.td || res.gain >= 3);
  play.kind = 'two'; play.text = `Two-point try: ${play.text} ${good ? 'GOOD!' : 'No good.'}`; play.headline = good ? '2-PT GOOD' : '2-PT FAILED';
  if (good) score(G, play, side, 2, 'two-point try');
  log(G, play, 0); return good;
}
export function doPat(G) {
  const s = G.s, side = s.patSide, diff = s.score[side] - s.score[other(side)];
  if (goForTwo(G, diff)) twoPoint(G, side);
  else { const play = start(G); play.off = side; play.def = other(side); if (extraPoint(G, play, side).good) score(G, play, side, 1, 'extra point'); log(G, play, 0); }
  s.phase = 'kickoff'; s.kicker = side;
}

// Runs the next scrimmage play. Returns the report; play.ended says how the possession ended (or null if it goes on).
export function scrimmage(G) {
  sides(G);
  const s = G.s, o = s.poss, d = G.defSide, play = start(G), R = G.R;
  play.keyPlay = isKeyPlay(G);
  const pre = preSnapFlag(G, play);
  if (pre) { // five yards and replay the down
    if (pre.off) { s.ballOn -= pre.yards; s.toGo += pre.yards; } else { s.ballOn += pre.yards; s.toGo -= pre.yards; if (s.toGo <= 0) { s.down = 1; s.toGo = Math.min(10, 100 - s.ballOn); play.result.firstDown = true; } }
    s.running = false; play.result.endOn = s.ballOn; return log(G, play, 0);
  }
  // a coach in the coaching room can make the call on a key play; otherwise the AI coach does
  // a human coach calls key plays (never in test mode: bots coach everyone); the defense sees the formation first
  const call = (play.keyPlay && !G.opts.testMode && G.opts.coachCall?.(G, o)) || offenseCall(G), def = defenseCall(G, call);
  play.call = call; play.defCall = def; play.clock.playClockAtSnap = s.snapClock ?? 25;
  let res, ended = null, secs = 5, moving = false;
  const touchdown = (side, how) => { score(G, play, side, 6, how); play.result.td = true; play.headline = play.headline || 'TOUCHDOWN'; s.poss = side; s.phase = 'pat'; s.patSide = side; ended = side === o ? 'td' : 'defTd'; };
  if (call.type === 'fg') {
    res = fieldGoal(G, play); secs = res.time;
    if (res.good) { score(G, play, o, 3, 'field goal'); s.phase = 'kickoff'; s.kicker = o; ended = 'fg'; } else { give(G, d, Math.max(20, 100 - (s.ballOn - 7))); ended = 'miss'; }
  } else if (call.type === 'punt') {
    res = punt(G, play); secs = res.time; ended = 'punt';
    if (res.td) touchdown(d, 'punt return'); else give(G, d, res.ballOn);
  } else if (call.type === 'spike') {
    play.kind = 'spike'; play.text = `${G.O.QB.last} spikes it to stop the clock.`; stat(play, G.O.QB, 'att');
    play.result.gain = 0; play.result.incomplete = true; s.down += 1; secs = 1;
  } else if (call.type === 'kneel') {
    play.kind = 'kneel'; play.text = `${G.O.QB.last} takes a knee.`; stat(play, G.O.QB, 'car'); stat(play, G.O.QB, 'ryds', -1);
    play.result.gain = -1; s.ballOn = Math.max(1, s.ballOn - 1); s.down += 1; s.toGo += 1; secs = 2; moving = true;
    if (s.down > 4) { give(G, d, 100 - s.ballOn); ended = 'downs'; moving = false; }
  } else {
    res = call.type === 'run' ? runPlay(G, play, call.sub, call, def) : passPlay(G, play, call.sub, def, call);
    scout(G, o, call, def, res); remember(G, o, call, play, res);
    secs = res.time; play.result.gain = res.gain; play.result.oob = !!res.oob; if (res.forced) play.result.forced = true;
    const flag = postPlayFlag(G, play, res, call), spot = s.ballOn + res.gain;
    if (flag) { // the play doesn't count
      play.result.played = res.gain;   // what the play gained before the flag (the broadcast shows the play as it happened)
      if (flag.off) { s.ballOn -= flag.yards; s.toGo += flag.yards; play.result.gain = -flag.yards; }
      else { s.ballOn += flag.yards; s.down = 1; s.toGo = Math.min(10, 100 - s.ballOn); play.result.gain = flag.yards; play.result.firstDown = true; }
    } else if (res.turnover === 'int') {
      play.result.turnover = 'int'; ended = 'int';
      if (spot >= 100) give(G, d, 20);
      else { const ret = Math.max(0, Math.round(R.gauss(9, 9))) + (R.chance(0.05) ? R.int(20, 70) : 0), at = 100 - spot + ret; stat(play, res.by, 'intyds', Math.min(ret, spot)); if (at >= 100) { touchdown(d, 'interception return'); play.headline = 'PICK SIX'; stat(play, res.by, 'dtd'); } else give(G, d, at); }
    } else if (res.fumble?.lost) {
      play.result.turnover = 'fumble'; play.headline = 'FUMBLE'; swing(G, d, 0.2); ended = 'fumble';
      const at = 100 - clamp(spot, 1, 99) + R.int(0, 6); play.text += ` FUMBLE! Recovered by ${res.fumble.recoveredBy.last}.`;
      if (at >= 100) touchdown(d, 'fumble return'); else give(G, d, at);
    } else if (res.td || spot >= 100) { play.result.gain = 100 - s.ballOn; if (!res.td) creditTd(play); touchdown(o, call.type === 'run' || play.scramble ? 'run' : 'pass'); }
    else if (spot <= 0) { score(G, play, d, 2, 'safety'); play.result.safety = true; play.headline = 'SAFETY'; s.phase = 'kickoff'; s.kicker = o; s.freeKick = true; ended = 'safety'; }
    else {
      s.ballOn = spot;
      if (res.gain >= s.toGo) { play.result.firstDown = true; s.down = 1; s.toGo = Math.min(10, 100 - spot); if (res.gain >= 20) play.big = true; }
      else { s.down += 1; s.toGo -= res.gain; }
      if (s.down > 4) { give(G, d, 100 - spot); swing(G, d, 0.15); play.result.turnover = 'downs'; play.headline = 'TURNOVER ON DOWNS'; ended = 'downs'; }
      else moving = !res.incomplete && !(res.oob && (s.quarter === 2 || s.quarter === 4) && s.clock < 120);
    }
  }
  play.result.endOn = s.ballOn; play.ended = ended; s.running = moving && !ended;
  return log(G, play, secs);
}
