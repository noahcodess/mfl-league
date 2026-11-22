// Stadium Pulse, the college football kind: how loud the home crowd is on a play, 0-100, on one scale for every stadium.
// It's built from the crowd itself (how full, how big the place is, how much the fans believe), the occasion (a rivalry or a
// color game like a whiteout goes up a few), the moment (3rd and long, 4th down, late in a close game, the red zone, overtime)
// and the crowd feeding on itself: a false start or a miscue in the noise makes it louder (heat). It only matters when the
// visiting team has the ball. Loud enough, it causes false starts, delay of game, receivers running the wrong route and a
// slightly shakier kick. The meter shows on the first snap of nearly every visiting drive, most 3rd downs, every 4th-down
// try and kicks, and on more and more 1st and 2nd downs the louder it gets. Momentum (momentum.js) pushes it up or down.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) >>> 0; x = ((x ^ (x >>> 13)) * 1274126177) >>> 0; return (x >>> 0) / 4294967296; };

// The crowd's energy before the moment counts, 0-1. crowd: { fill, capacity, fan, rivalry, color } from data/gameCrowd.
export function crowdEnergy(c) {
  if (!c) return 0;
  const size = clamp(((c.capacity || 60000) - 45000) / 45000, 0, 1), fan = clamp((c.fan ?? 50) / 100, 0, 1);
  return clamp((c.fill ?? 0.7) ** 1.3 * (0.5 + 0.3 * size + 0.2 * fan) + (c.rivalry ? 0.1 : 0) + (c.color ? 0.08 : 0), 0, 1);
}

// How much the moment makes them stand up, 0-1. s: the game state; away has the ball.
function moment(s) {
  const toGo = s.toGo, diff = Math.abs(s.score.home - s.score.away), q = s.quarter;
  let m = s.down === 3 ? 0.62 + (toGo >= 7 ? 0.15 : toGo <= 2 ? -0.05 : 0.05) : s.down === 4 ? 0.85 : 0.25;
  if (q >= 5) m += 0.3; else if (q === 4 && diff <= 8) m += 0.22 * (1 - s.clock / (s.qlen || 360)) + 0.08;
  if (q === 2 && s.clock <= 120) m += 0.05;
  if (100 - s.ballOn <= 20) m += 0.08;                       // backed up against the home end zone
  if (diff >= 21) m -= 0.3;
  return clamp(m, 0, 1);
}

// The pulse for the coming snap. Returns { v (0-100, or null with no crowd), p (0-1 effect on the visitors), away (visitors have the ball) }.
export function pulseNow(G) {
  const c = G.opts?.crowd, s = G.s;
  if (!c) return { v: null, p: 0, away: false };
  const away = s.poss === 'away', e = G.crowdE ?? (G.crowdE = crowdEnergy(c)), mom = clamp(G.mom || 0, -1, 1);
  const raw = away ? e * (0.3 + 0.7 * moment(s)) + (G.heat || 0) + (mom > 0 ? mom * 0.16 : mom * 0.12) : e * 0.18;   // momentum: a rolling home team gets louder, a visiting surge quiets the house   // their own offense: the crowd hushes
  const v = Math.round(clamp(raw, 0, 1) * 100);
  return { v, p: away ? v / 100 : 0, away };
}

// Does the meter pop up for this play? Decided from the play itself (no dice from the game, so it never changes a result).
export function pulseShows(G, play, pul) {
  if (pul.v == null || !pul.away) return false;
  const k = play.kind, d = play.before.down, e = G.crowdE || 0, r = hash(G.seed || 1, play.n);
  if (k === 'fg' || k === 'punt' || d === 4) return e > 0.03;                 // 4th down, kicks: basically always
  if (G.lastOff !== play.off) return e > 0.06 ? r < 0.94 : r < 0.35;   // the first snap of a drive: the house greets them (rarely not)
  if (d === 3) return e > 0.12 ? r < 0.97 : r < 0.5;
  if (d === 2) return r < (pul.v >= 45 ? 0.75 : pul.v >= 25 ? 0.5 : e > 0.1 ? 0.25 : 0.08);
  return r < (pul.v >= 60 ? 0.55 : pul.v >= 40 ? 0.3 : pul.v >= 25 ? 0.15 : e > 0.15 ? 0.06 : 0);
}

// After the play: the crowd feeds on what happened. loud = the visitors cracked (a flag, a miscue, a sack, an incompletion).
export function pulseAfter(G, pul, loud, bigStop) {
  const h = (G.heat || 0) * 0.78;
  G.heat = clamp(h + (pul.p > 0.45 && loud ? 0.07 * pul.p + 0.02 : 0) + (bigStop ? 0.08 : 0), 0, 0.3);
}

// Writes the pulse onto the play for the broadcast ({ v, show, hit }) and lets the crowd react to how it went.
export function stampPulse(G, play, pul) {
  if (pul.v == null) return;
  const r = play.result || {}, loud = !!play.crowdHit || (pul.away && (r.incomplete || play.kind === 'sack' || play.kind === 'penalty'));
  const stop = pul.away && (r.turnover === 'int' || r.turnover === 'fumble' || r.turnover === 'downs');
  play.pulse = { v: pul.v, show: pulseShows(G, play, pul), hit: !!play.crowdHit };
  pulseAfter(G, pul, loud, stop);
  G.lastOff = play.off;
}

// Noise in decibels for the graphic (a quiet house ~70 dB, a deafening one ~130).
export const pulseDb = (v) => Math.round(70 + v * 0.6);
export const pulseWord = (v) => (v >= 88 ? 'DEAFENING' : v >= 72 ? 'ELECTRIC' : v >= 55 ? 'ROCKING' : v >= 35 ? 'LOUD' : 'MURMUR');
