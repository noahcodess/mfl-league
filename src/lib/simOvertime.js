// College overtime. Each team gets the ball at the other team's 25 with no game clock. From the 2nd overtime a touchdown
// must be followed by a two-point try. From the 3rd overtime on, the teams just trade two-point tries until one leads.
import { other } from './simCore.js';
import { scrimmage, twoPoint, score } from './simDrive.js';
import { newPlay } from './simReport.js';
import { extraPoint } from './simKicks.js';

function possession(G, side) {
  const s = G.s; s.poss = side; s.ballOn = 75; s.down = 1; s.toGo = 10; s.phase = 'play'; s.running = false;
  for (let i = 0; i < 40; i++) {
    const play = scrimmage(G);
    if (!play.ended) continue;
    if (play.ended === 'td') {
      if (s.ot >= 2) twoPoint(G, side);
      else { const xp = newPlay({ ...s, hash: 'middle' }, G.plays.length + 1); xp.stats = []; xp.off = side; xp.def = other(side); if (extraPoint(G, xp, side).good) score(G, xp, side, 1, 'extra point'); xp.after = { score: { ...s.score } }; G.plays.push(xp); }
    }
    return play.ended === 'defTd';
  }
  return false;
}

export function overtime(G) {
  const s = G.s; let first = G.R.chance(0.5) ? 'home' : 'away';
  while (s.score.home === s.score.away && s.ot < 30) {
    s.ot += 1; s.quarter = 4 + s.ot; s.to = { home: 1, away: 1 };
    if (s.ot >= 3) { twoPoint(G, first); twoPoint(G, other(first)); }
    else if (!possession(G, first)) possession(G, other(first));
    first = other(first);
  }
}
