// College overtime, MFL style. One coin toss, then the team that goes first alternates every overtime. Each team gets the
// ball at the other team's 30 with no game clock. OT2: a touchdown must go for two. OT3 and on: each round is one two-point
// try per team, and every round is a new overtime (OT3, OT4 ...) until somebody leads. No limit.
import { other } from './simCore.js';
import { scrimmage, twoPoint, score } from './simDrive.js';
import { newPlay } from './simReport.js';
import { extraPoint } from './simKicks.js';

const ANSWER = 4;   // rating points for a team that needs a TD to answer in OT1 (tuned so OT2 is the most common ending: ~38% end in OT1, ~40% in OT2)
function possession(G, side, second = false) {
  const s = G.s; G.answer = second && s.ot === 1 && s.score[other(side)] - s.score[side] >= 4 ? side : null; G.answerBoost = ANSWER;   // only when it takes a touchdown to answer
  G.otSecond = second;
  s.poss = side; s.ballOn = 70; s.down = 1; s.toGo = 10; s.phase = 'play'; s.running = false;
  for (let i = 0; i < 40; i++) {
    s.snapClock = G.R.int(7, 14);   // no game clock to manage, so snaps come with the usual handful left on the 24
    const play = scrimmage(G);
    if (!play.ended) continue;
    if (play.ended === 'td') {
      if (second && s.score[side] > s.score[other(side)]) return false;   // a walk-off: the game's over, no try after it
      if (s.ot >= 2) twoPoint(G, side);
      else { const xp = newPlay({ ...s, hash: 'middle' }, G.plays.length + 1); xp.stats = []; xp.off = side; xp.def = other(side); if (extraPoint(G, xp, side).good) score(G, xp, side, 1, 'extra point'); xp.after = { score: { ...s.score }, quarter: s.quarter, clock: 0 }; G.plays.push(xp); }
    }
    return play.ended === 'defTd';
  }
  return false;
}

export function overtime(G) {
  const s = G.s; let first = G.R.chance(0.5) ? 'home' : 'away';
  while (s.score.home === s.score.away && s.ot < 500) {   // 500 is only a safety net, never reached
    s.ot += 1; s.quarter = 4 + s.ot; s.to = { home: 1, away: 1 };
    if (s.ot >= 3) { twoPoint(G, first); twoPoint(G, other(first)); }
    else if (!possession(G, first)) possession(G, other(first), true);
    G.answer = null;
    first = other(first);
  }
}
