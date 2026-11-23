// Injuries in the engine. After every play, the players who took a hit (the ball carrier and his tackler, a sacked QB and
// the man who got him), a lineman in the trenches and one player who might pull something on his own each get a tiny
// chance of getting hurt. Toughness decides most of it, then age (21-year-olds bounce back, 26 and 27 break down), then his
// Durability rating. It's never likely for anyone: about one injury every three games across both teams. He goes down,
// the best backup at his spot takes over, and the kind that can heal in a game (cramps, a stinger) may let him back in.
// There is no fatigue between plays: every snap starts fresh.
import { addEvent } from './simReport.js';
import { clamp, val } from './simCore.js';
import { overall } from './simLineup.js';
import { pickInjury, severity, SEASON } from './injuryTypes.js';

const BASE = 0.0026;   // tuned for about 0.3 injuries a game
const AGE = { 21: 0.75, 22: 0.8, 23: 0.88, 24: 0.97, 25: 1.08, 26: 1.3, 27: 1.5 };
const LINE_O = ['OT1', 'OG1', 'C', 'OG2', 'OT2'], LINE_D = ['DE1', 'DT1', 'DT2', 'DE2', 'DL'], SKILL = ['RB', 'WR1', 'WR2', 'WR3', 'TE', 'CB1', 'CB2', 'SS', 'FS', 'LB1', 'LB2'];

// How breakable he is, about 0.1 (tough and young) to 4 (soft and 27). 1 = an average player.
export function frailty(G, p) {
  const tough = val(G, p, 'toughness', 60), t = clamp(((100 - tough) / 38) ** 1.7, 0.08, 3);
  const age = AGE[p.age] ?? (p.age > 27 ? 1.6 : 0.75), dur = clamp((1.6 - (p.durability ?? 67) / 100) / 0.93, 0.7, 1.4);
  return t * age * dur;
}

function findAll(G) { const m = {}; for (const side of ['home', 'away']) { const T = G.teams[side]; [...Object.values(T.O), ...Object.values(T.D), ...T.bench].forEach((p) => { if (p?.id) m[p.id] = p; }); } return m; }
const byId = (G, id) => (G.who ||= findAll(G))[id];

// Puts sub in for p everywhere he plays (offense, defense, kick teams). Remembers it so he can come back.
function swapOut(G, p) {
  const T = G.teams[p.side], out = G.out, pos = p.pos;
  const sub = T.bench.filter((b) => !out.has(b.id) && b.pos === pos).sort((a, b) => overall(b) - overall(a))[0]
    || T.bench.filter((b) => !out.has(b.id) && (b.pos || '').slice(0, 1) === (pos || '').slice(0, 1)).sort((a, b) => overall(b) - overall(a))[0];
  const moves = [];
  for (const unit of [T.O, T.D]) for (const [key, who] of Object.entries(unit)) if (who?.id === p.id && sub) { unit[key] = sub; moves.push([unit, key]); }
  for (const u of Object.values(T.kick)) {
    u.players.forEach((x, i) => { if (x?.id === p.id && sub) { u.players[i] = sub; moves.push([u.players, i]); } });
    for (const k of ['kicker', 'punter', 'returner', 'holder']) if (u[k]?.id === p.id && sub) { u[k] = sub; moves.push([u, k]); }
  }
  if (sub) T.bench = T.bench.filter((b) => b.id !== sub.id);
  (G.swaps ||= {})[p.id] = { sub, moves };
  return sub;
}

// The hurt man is back (only the in-game kind): he takes his spots back and the backup goes back to the bench.
export function injuryReturns(G) {
  for (const x of G.injuries) {
    if (x.back == null || x.returned || G.plays.length + 1 < x.back) continue;
    const sw = G.swaps?.[x.id], p = byId(G, x.id); x.returned = true; G.out.delete(x.id);
    if (!sw || !p) continue;
    for (const [obj, key] of sw.moves) if (obj[key]?.id === sw.sub?.id) obj[key] = p;
    if (sw.sub) G.teams[p.side].bench.push(sw.sub);
    (G.backNow ||= []).push(x.id);
  }
}

function hurt(G, play, p, contact, t) {
  const R = G.R, type = pickInjury(contact, R.r());
  let weeks = type.max >= SEASON ? SEASON : R.int(type.min, type.max);
  if (weeks > 0 && weeks < SEASON) weeks = Math.max(Math.max(1, type.min - 1), Math.round(weeks * (1.2 - (p.recovery ?? 60) / 250)));   // a quick healer shaves a little off
  const s = G.s, time = s.quarter <= 3 || (s.quarter === 4 && s.clock > 240), back = weeks === 0 && time ? G.plays.length + 1 + R.int(7, 18) : null;   // the in-game kind: back in a few series
  G.out.add(p.id);
  const sub = swapOut(G, p);
  const x = { id: p.id, name: p.name, side: p.side, pos: p.pos, type: type.key, label: type.name, part: type.part, weeks, severity: severity(weeks), n: play.n, back, sub: sub?.id || null, returned: false };
  G.injuries.push(x);
  addEvent(play, 'injury', t, { id: p.id, type: type.key, part: type.part, weeks, sub: sub?.id || null });
  play.text += ` ${p.last} is down on the field (${type.name.toLowerCase()}).`;
  return x;
}

// After a play: does anyone get hurt? (At most one per play.) play.events say who hit whom.
export function injuryCheck(G, play) {
  G.out ||= new Set();
  if (G.backNow?.length) { G.backNow.forEach((id) => addEvent(play, 'injuryReturn', 0, { id })); G.backNow = []; }
  if (G.opts?.noInjuries || ['xp', 'kneel', 'spike'].includes(play.kind)) return null;
  const R = G.R, list = [], ev = play.events || [], dur = Math.max(1.5, ...ev.map((e) => e.t || 0));
  for (const e of ev) {
    if (e.type === 'tackle' && e.result === 'made') { list.push([e.carrier, 1, true, e.t]); list.push([e.def, 0.55, true, e.t]); }
    if (e.type === 'pressure' && e.kind === 'sack') { list.push([G.O?.QB?.id, 1.1, true, e.t]); list.push([e.by, 0.35, true, e.t]); }
  }
  if (['run', 'pass', 'sack'].includes(play.kind) && G.O && G.D) {
    list.push([(R.chance(0.5) ? G.O[R.pick(LINE_O)] : G.D[R.pick(LINE_D)])?.id, 0.18, true, 0.4 + R.r() * (dur - 0.4)]);   // the trenches
    const k = R.pick(SKILL), team = /^(CB|SS|FS|LB)/.test(k) ? G.D : G.O;
    list.push([team[k]?.id, 0.9, false, 0.3 + R.r() * (dur - 0.3)]);   // pulls something on his own
  }
  for (const [id, w, contact, t] of list) {
    const p = id && byId(G, id);
    if (!p || p.league || G.out.has(p.id) || String(p.id).includes('-sub-')) continue;
    const chance = Math.min(0.012 * w, BASE * w * frailty(G, p) * (G.opts?.rivalry ? 1.15 : 1));   // nobody's chance is ever high
    if (R.chance(chance)) return hurt(G, play, p, contact, t ?? 0);
  }
  return null;
}
