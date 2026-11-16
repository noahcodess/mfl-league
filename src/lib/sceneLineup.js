// Shared pieces of every scrimmage play: lining up (with a huddle break when there's time), the line battle, pursuit, and
// the tackle. The tackle goes to the engine's tackler if he can actually get there at his own speed; if he can't, the
// closest defender who can makes it, so nobody ever has to warp across the field.
import { B, clamp, dist, stepTo, getGoing } from './sceneCore.js';
import { FORMATIONS } from './playbookFormations.js';   // a.pre: where a player jogs to before the snap (sceneCore runs it)

export const OFF = { OT1: [-1.6, -4], OG1: [-1.45, -2], C: [-1.3, 0], OG2: [-1.45, 2], OT2: [-1.6, 4], TE: [-1.7, 6.2], QB: [-4.5, 0], RB: [-4.5, 1.8], WR1: [-0.8, -14], WR2: [-0.8, 14] };
export const DEF = { DE1: [1.7, -5], DT1: [1.6, -2.1], DL: [1.6, 0], DT2: [1.6, 2.1], DE2: [1.7, 5], LB1: [4.5, -3.2], LB2: [4.5, 3.2], CB1: [5.5, -14], CB2: [5.5, 14], SS: [11, 0.5] };
export const MATCH = { OT1: 'DE1', OG1: 'DT1', C: 'DL', OG2: 'DT2', OT2: 'DE2' }, COVER = { WR1: 'CB1', WR2: 'CB2', TE: 'SS', RB: 'LB1' };
export const ev = (play, type) => play.events.filter((e) => e.type === type);
const STANCE = (k) => (/^(OT|OG|C)$/.test(k) || k === 'TE' ? 'olset' : k === 'QB' ? 'qbset' : k === 'RB' ? 'rbset' : k.startsWith('WR') ? 'wrset' : /^D/.test(k) ? 'dlset' : k.startsWith('LB') ? 'lbset' : 'cbset');

// Field helpers on the scene: S.dir (+1 away team going right), S.los (absolute yard line), S.at(along, lat) -> [x, y].
export function frame(S, play, losOverride) {
  S.dir = play.off === 'away' ? 1 : -1;
  S.los = losOverride ?? (play.off === 'away' ? play.before.ballOn : 100 - play.before.ballOn);
  S.at = (along, lat) => [S.los + S.dir * along, clamp(lat, -26.2, 26.2)];
  S.along = (a) => (a.x - S.los) * S.dir;
}

// Lines everyone up for a snap in the play's formation, with the defense matching it (corners over their receivers, a
// linebacker out over a back split wide). opts: { under (QB under center), huddle (break the huddle and jog in) }.
export function lineup(S, lineups, opts = {}) {
  const play = S.play, slot = (list) => Object.fromEntries(list.map((s) => [s.key, s.player]));
  const O = slot(lineups[play.off].offense), Dd = slot(lineups[play.def].defense), A = {}, D = {};
  const place = (p, side, [al, lat], key) => {
    const [x, y] = S.at(al, lat), a = S.add(p, side, x, y, side === play.off ? S.dir : -S.dir, STANCE(key));
    if (a) a.key = key;
    return a;
  };
  const spots = FORMATIONS[play.call?.form]?.spots || {};
  Object.entries(OFF).forEach(([k, spot]) => { A[k] = place(O[k], play.off, opts.under && k === 'QB' ? [-2.2, 0] : opts.under && k === 'RB' ? [-6.5, 0] : spots[k] || spot, k); });
  const lat = (k, fb) => (A[k] ? (A[k].y - (S.at(0, 0)[1])) : fb);
  const dspot = { ...DEF, CB1: [5.5, lat('WR1', -14)], CB2: [5.5, lat('WR2', 14)], SS: [11, clamp(lat('TE', 6) * 0.15, -3, 3)] };
  if (Math.abs(lat('RB', 0)) > 6) dspot.LB1 = [4, lat('RB', 0) * 0.85];   // a back split out wide gets a linebacker over him
  Object.entries(DEF).forEach(([k]) => { D[k] = place(Dd[k], play.def, dspot[k], k); });
  if (A.QB) { A.QB.qb = true; if (opts.under) A.QB.idle = 'rbset'; }
  S.ball.x = S.los; S.ball.y = 0; S.ball.h = 0.12;
  if (opts.huddle && S.T0 >= 3) { // break the huddle: everyone jogs to his spot and is set and still well before the snap
    const ready = S.T0 - 1.3;
    for (const a of S.actors) {
      const sx = a.x, sy = a.y, off = a.side === play.off, [hx, hy] = off ? S.at(-8 + S.rand() * 1.5, sy * 0.15) : S.at(S.along(a) + 3.5, sy * 0.55);
      a.x = hx; a.y = hy; a.pre = { x: sx, y: sy, speed: Math.min(7.5, dist(hx, hy, sx, sy) / Math.max(0.6, ready - 0.4)) };
    }
  }
  S.lines = { los: S.los, first: play.before.ballOn + play.before.toGo < 100 ? S.los + S.dir * play.before.toGo : null };
  return { A, D };
}

// The line. pass: true for pass protection. rush: { defId: seconds until he gets home } (only winners matter). aim: the QB actor.
// blocks: { defId: 'pancake' | 'drive' | 'shed' } for runs. Each pair keeps its own rhythm so nobody moves in sync.
export function lineFight(S, A, D, pass, { rush = {}, blocks = {}, qb = null, carrier = null } = {}) {
  const dir = S.dir;
  Object.entries(MATCH).forEach(([ok, dk]) => {
    const ol = A[ok], dl = D[dk]; if (!ol || !dl) return;
    const ph = S.rand() * 6.28, per = 2.6 + S.rand() * 2.2, gap = 1.7, win = rush[dl.id], move = blocks[dl.id];
    let shed = false;
    ol.brain = (a, dt, s) => {
      if (s.t < s.T0 + getGoing(a.p)) return;
      if (shed) { if (!pass && carrier) stepTo(a, carrier.x, carrier.y, a.max * 0.55, dt); return; }
      s.setPose(a, pass ? (Math.sin(s.t * 1.3 + ph) > 0 ? 'anchor' : 'block') : move === 'shed' ? 'driven' : 'drive');
      const settle = pass ? -1.4 : 0.4, base = s.los + dir * settle;
      const tx = Math.abs(a.x - s.los) < 1.6 && s.t < s.T0 + 0.5 ? base : dl.x - dir * gap;
      stepTo(a, tx, dl.y + Math.sin(s.t * per + ph) * 0.12, pass ? 3.2 : 4, dt);
    };
    dl.brain = (a, dt, s) => {
      if (s.t < s.T0) return;
      if (shed) return;
      s.setPose(a, pass ? (win ? (Math.sin(s.t * per + ph) > 0 ? 'swim' : 'rush') : 'rush') : move === 'shed' ? 'swim' : move ? 'driven' : 'block');
      const push = pass ? (win ? 0.55 : 0.2) : move === 'pancake' || move === 'drive' ? -1.1 : 0.15;   // yards per second he gains (negative: driven back)
      stepTo(a, a.x - dir * push * 3, a.y + Math.sin(s.t * per + ph) * 0.3, Math.abs(push), dt);
    };
    if (pass && win != null && qb) { // he beats his man and goes to get the quarterback, at his own speed
      S.when(S.T0 + Math.max(0.4, win - 1.1), (s) => { shed = true; s.setPose(ol, 'driven', 0.9); dl.pose = null; dl.brain = B.pursue(qb, dl.max * 0.95, 0.6); });
    }
    if (!pass && move === 'pancake') S.when(S.T0 + 0.9, (s) => { s.knock(dl, 1.6); });
    if (!pass && move === 'shed' && carrier) S.when(S.T0 + 0.7, () => { shed = true; dl.pose = null; dl.brain = B.pursue(carrier, dl.max * 0.9, 1); });
  });
}

// Everyone on the other side (but `except`) chases the carrier from time t.
export function pursueAll(S, carrier, t, except = []) {
  S.when(t, (s) => { for (const a of s.actors) if (a.side !== carrier.side && !except.includes(a) && !a.down) { a.pose = null; a.brain = B.pursue(carrier, a.max * (0.86 + s.rand() * 0.1), 1.2 + s.rand()); } });
}

// The end of a carry: the carrier reaches `end` at tEnd and is tackled (or scores, or steps out). tk: who the engine says made it.
export function finishCarry(S, carrier, end, tEnd, { tk = null, td = false, oob = false, fumble = null } = {}) {
  const runDir = Math.sign(end[0] - carrier.x) || S.dir;
  if (!td && !oob) S.when(Math.max(S.T0, tEnd - 1.1), (s) => { // pick whoever can really get there in time
    const can = (a) => a && !a.down && dist(a.x, a.y, end[0], end[1]) <= a.max * 1.1 * (tEnd - s.t) + 1.5;
    const best = can(tk) ? tk : s.actors.filter((a) => a.side !== carrier.side && can(a)).sort((m, n) => dist(m.x, m.y, end[0], end[1]) - dist(n.x, n.y, end[0], end[1]))[0] || tk;
    if (!best) return;
    best.pose = null; best.brain = B.meet(end[0] + runDir * 0.7, end[1] + 0.2, tEnd, best.max * 1.1);
    s.when(tEnd - 0.22, () => s.setPose(best, 'tackle', 0.3)); s.tackler = best;
  });
  S.when(tEnd, (s) => {
    if (td) { // he scores: celebrate, teammates come over, the defense jogs off
      carrier.brain = B.to(carrier.x + runDir * 1.5, carrier.y, 3); carrier.celebrate = true; s.setPose(carrier, 'cheer');
      for (const a of s.actors) if (a !== carrier && a.side === carrier.side && dist(a.x, a.y, carrier.x, carrier.y) < 22) { a.pose = null; a.brain = B.gather(s, carrier.x, carrier.y, 2); s.when(s.t + 1.2, () => s.setPose(a, 'cheer')); }
      return;
    }
    if (oob) { carrier.brain = B.to(carrier.x + runDir * 1.5, carrier.y > 0 ? 28.5 : -28.5, 4.5); return; }
    s.knock(carrier, 1.7); if (s.tackler && dist(s.tackler.x, s.tackler.y, carrier.x, carrier.y) < 2.2) s.knock(s.tackler, 1.5);
    if (fumble) { s.loose(runDir * 3, (s.rand() - 0.5) * 4, 4); const rec = s.by[fumble.recoveredBy]; if (rec) s.when(s.t + 0.5, () => { rec.down = false; rec.brain = B.meet(s.ball.x, s.ball.y, s.t + 0.6, rec.max, (r, ss) => { ss.knock(r); ss.give(r); }); }); }
    for (const a of s.actors) if (!a.down && a !== carrier && a !== s.tackler) { a.pose = null; a.brain = dist(a.x, a.y, carrier.x, carrier.y) < 16 ? B.gather(s, carrier.x, carrier.y, 2.2) : B.to(a.x + (carrier.x - a.x) * 0.25, a.y, 2.2); }
  });
}
