// Stadium Pulse, the college football kind: how loud the home crowd is on a play, 0-100, on one scale for every stadium.
// It's built from the crowd itself (how full, how big the place is, how much the fans believe), the occasion (a rivalry or a
// color game like a whiteout goes up a few), the moment (3rd and long, 4th down, late in a close game, the red zone, overtime)
// and the crowd feeding on itself: a false start or a miscue in the noise makes it louder (heat). It only matters when the
// visiting team has the ball. Loud enough, it causes false starts, delay of game, receivers running the wrong route and a
// slightly shakier kick. The meter shows on the first snap of nearly every visiting drive, most 3rd downs, every 4th-down
// try and kicks, and on more and more 1st and 2nd downs the louder it gets, and again right after a big stop by the home
// defense. Momentum (momentum.js) pushes it up or down.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) >>> 0; x = ((x ^ (x >>> 13)) * 1274126177) >>> 0; return (x >>> 0) / 4294967296; };

// The crowd's energy before the moment counts, 0-1. crowd: { fill, capacity, fan, rivalry, color } from data/gameCrowd.
export function crowdEnergy(c) {
  if (!c) return 0;
  const size = clamp(((c.capacity || 60000) - 55000) / 42000, 0, 1), fan = clamp((c.fan ?? 50) / 100, 0, 1);   // a bigger place helps, but how full it is matters far more
  return clamp((c.fill ?? 0.7) ** 2 * (0.66 + 0.12 * size + 0.22 * fan) + (c.rivalry ? 0.08 : 0) + (c.color ? 0.06 : 0), 0, 1);
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
  const raw = away ? e * (0.3 + 0.72 * moment(s)) + (G.heat || 0) + (mom > 0 ? mom * 0.16 : mom * 0.12) : e * 0.18;   // momentum: a rolling home team gets louder, a visiting surge quiets the house   // their own offense: the crowd hushes
  const v = Math.round(clamp(raw > 0.8 ? 0.8 + (raw - 0.8) * 0.5 : raw, 0, 1) * 100);   // the top end comes hard: 100 (130 dB) takes everything at once
  return { v, p: away ? (v / 100) * 0.88 : 0, away };   // how hard it rattles the visitors
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

// The house erupting after a big stop by the home defense (an interception always; a sack, a stop on 3rd or 4th down,
// a loss, an incompletion once it's already loud). Returns the level for the meter after the play, or null.
function afterPlay(play, pul) {
  if (!pul.away) return null;
  const r = play.result || {}, d = play.before.down, stop = (d === 3 || d === 4) && !r.firstDown && !r.td && play.kind !== 'penalty' && play.kind !== 'punt' && play.kind !== 'fg';
  const bump = r.turnover === 'int' || r.turnover === 'fumble' ? 14 : r.turnover === 'downs' ? 12 : play.kind === 'sack' ? 8 : stop ? 6 : (r.gain ?? 0) < 0 && play.kind === 'run' ? 3 : r.incomplete ? -4 : null;
  if (bump == null || (bump < 14 && pul.v < (bump >= 6 ? 40 : 50))) return null;
  return Math.max(0, Math.min(100, pul.v + bump));
}

// Writes the pulse onto the play for the broadcast ({ v, show, hit, after }) and lets the crowd react to how it went.
export function stampPulse(G, play, pul) {
  if (pul.v == null) return;
  const r = play.result || {}, loud = !!play.crowdHit || (pul.away && (r.incomplete || play.kind === 'sack' || play.kind === 'penalty'));
  const stop = pul.away && (r.turnover === 'int' || r.turnover === 'fumble' || r.turnover === 'downs');
  play.pulse = { v: pul.v, show: pulseShows(G, play, pul), hit: !!play.crowdHit, after: afterPlay(play, pul) };
  pulseAfter(G, pul, loud, stop);
  G.lastOff = play.off;
}

// Noise in decibels for the graphic: never under 78, a small place two-thirds full sits around 80-90, a sold-out big house
// gets to 120-125 on the big downs, and 130 is the most it will ever read.
export const DB_MIN = 78, DB_MAX = 130;
export const pulseDb = (v) => { const x = clamp(v / 100, 0, 1); return Math.round(DB_MIN + (DB_MAX - DB_MIN) * (0.5 * x + 0.5 * x * x * (3 - 2 * x))); };
export const pulseWord = (v) => (v >= 88 ? 'DEAFENING' : v >= 72 ? 'ELECTRIC' : v >= 55 ? 'ROCKING' : v >= 35 ? 'LOUD' : 'MURMUR');
