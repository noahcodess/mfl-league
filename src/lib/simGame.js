// Plays a whole game. Give it two game-day lineups and a seed and it runs every snap (regulation, then college overtime if
// tied). createGame + stepGame run it one snap at a time (a live broadcast); playGame runs it all at once (Quick Sim, the
// Sim Lab). The same seed always plays the exact same game. Nothing here draws anything.
import { dice, other, val, mix } from './simCore.js';
import { scrimmage, doKickoff, doPat } from './simDrive.js';
import { tempo } from './simCalls.js';
import { overtime } from './simOvertime.js';
import { tally } from './simStats.js';

export const QUARTER_SECONDS = 360;
const dummy = (side, key) => ({ id: `${side}-sub-${key}`, name: 'Emergency Sub', last: 'Sub', pos: key.replace(/\d/, ''), r: {}, mood: 'normal', side, stars: 1 });

function team(lineup, side, R) {
  const tag = (p) => ({ ...p, side, form: R.gauss(0, 1.5) }), seen = {}, one = (p) => (seen[p.id] ||= tag(p));   // every player has his own day
  const slots = (list) => Object.fromEntries(list.map(({ key, player }) => [key, player ? one(player) : dummy(side, key)]));
  const O = slots(lineup.offense), D = slots(lineup.defense), G0 = { mom: 0 };
  const kick = Object.fromEntries(Object.entries(lineup.kickTeams).map(([k, u]) => [k, { ...u, players: u.players.map(one), kicker: u.kicker && one(u.kicker), punter: u.punter && one(u.punter), returner: u.returner && one(u.returner), holder: u.holder && one(u.holder) }]));
  const wr = (p) => mix(G0, p, { route_running: 0.4, speed: 0.3, catching: 0.3 }, 50);
  O.star = wr(O.WR1) >= wr(O.WR2) ? 'WR1' : 'WR2';
  // an offense with a better passer than runner throws a little more, and the other way round
  O.passEdge = Math.max(-0.08, Math.min(0.08, (val(G0, O.QB, 'short_acc', 55) - val(G0, O.RB, 'vision', 55)) / 250));
  return { id: lineup.teamId, O, D, kick, bench: lineup.bench.map(one) };
}

function endQuarter(G) {
  const s = G.s; s.running = false;
  if (s.quarter === 2) { s.quarter = 3; s.clock = s.qlen; s.to = { home: 3, away: 3 }; s.phase = 'kickoff'; s.kicker = G.openingReceiver; s.freeKick = false; }
  else if (s.quarter >= 4) { if (s.score.home === s.score.away) overtime(G); s.over = true; }
  else { s.quarter += 1; s.clock = s.qlen; }
}

// Runs the next thing that happens (a snap, a kickoff, a try, or the end of a quarter).
export function stepGame(G) {
  const s = G.s;
  if (s.over) return null;
  if (s.clock <= 0 && s.phase !== 'pat') return endQuarter(G);
  if (s.phase === 'kickoff') return doKickoff(G);
  if (s.phase === 'pat') return doPat(G);
  if (s.running) { // the clock runs between plays; the team that's behind burns timeouts late to stop it
    const d = other(s.poss), late = s.quarter === 4 && s.clock < 150 && s.score[d] < s.score[s.poss] && s.score[s.poss] - s.score[d] <= 16;
    if (late && s.to[d] > 0) { s.to[d] -= 1; s.snapClock = 40; G.timeouts.push({ n: G.plays.length + 1, side: d, quarter: s.quarter, clock: s.clock }); }
    else {
      let run = tempo(G); if ((s.quarter === 2 || s.quarter === 4) && s.clock > 120 && s.clock - run < 120) run = s.clock - 120;   // stops at the two-minute warning
      s.snapClock = Math.max(1, 40 - run); if (run >= s.clock) { s.clock = 0; return endQuarter(G); } s.clock -= run;
    }
  } else s.snapClock = G.R.int(8, 18);
  return scrimmage(G);
}

// home, away: lineups from loadLineups. seed: any whole number.
// opts: { quarterSeconds, rivalry, receiver ('home' | 'away', from the real coin flip), coachCall(G, side) -> a call for a key play, or nothing to let the AI pick }.
export function createGame(home, away, seed, opts = {}) {
  const R = dice(seed), flip = R.chance(0.5) ? 'home' : 'away', receiver = opts.receiver || flip, qlen = opts.quarterSeconds || QUARTER_SECONDS;
  const G = { R, opts, seed, mom: 0, form: { home: R.gauss(0, 2.2), away: R.gauss(0, 2.2) },   // some days a team has it, some days it doesn't
    teams: { home: team(home, 'home', R), away: team(away, 'away', R) }, plays: [], scoring: [], timeouts: [], injuries: [], openingReceiver: receiver };
  G.s = { quarter: 1, clock: qlen, qlen, poss: receiver, down: 1, toGo: 10, ballOn: 25, score: { home: 0, away: 0 }, to: { home: 3, away: 3 }, phase: 'kickoff', kicker: other(receiver), running: false, ot: 0, over: false };
  return G;
}
export const gameResult = (G) => ({ seed: G.seed, home: G.teams.home.id, away: G.teams.away.id, score: G.s.score, overtimes: G.s.ot, plays: G.plays, scoring: G.scoring,
  timeouts: G.timeouts, injuries: G.injuries, form: G.form, receiver: G.openingReceiver, ...tally(G.plays) });
export function playGame(home, away, seed, opts = {}) {
  const G = createGame(home, away, seed, opts);
  for (let i = 0; i < 900 && !G.s.over; i++) stepGame(G);
  return gameResult(G);
}
