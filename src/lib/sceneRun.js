// Run plays on the field: the snap, the mesh and handoff, the back hitting the hole and every broken tackle the engine
// reports (the defender who whiffs dives and hits the turf while the runner jukes, spins or stiff-arms), then the tackle
// where the engine says. Also scrambles, QB sneaks from under center, and kneel-downs.
import { B, clamp, dist, getGoing } from './sceneCore.js';
import { lineup, lineFight, pursueAll, finishCarry, ev } from './sceneLineup.js';

const MOVE = { juke: 'juke', shake: 'juke', spin: 'spin', 'stiff arm': 'stiff', truck: 'stiff' };

// The carrier's run after he has the ball: through each broken tackle to the end spot. Returns tEnd.
function carryPath(S, c, from, t0, endAlong, endLat, play) {
  const broken = ev(play, 'tackle').filter((e) => e.result === 'broken'), made = ev(play, 'tackle').find((e) => e.result === 'made');
  const end = S.at(play.result.td ? endAlong + 2 : endAlong, play.result.oob ? (endLat >= 0 ? 26.2 : -26.2) : endLat);
  const pts = [from], marks = [];
  broken.forEach((e, i) => { const al = clamp(e.at, S.along({ x: from[0] }) + 1, endAlong - 0.5), k = (al - S.along({ x: from[0] })) / Math.max(1, endAlong - S.along({ x: from[0] })); const p = S.at(al, from[1] + (end[1] - from[1]) * k + (i % 2 ? 1.6 : -1.6)); pts.push(p); marks.push({ e, p }); });
  pts.push(end);
  let L = 0; const at = [0]; for (let i = 1; i < pts.length; i++) { L += dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); at.push(L); }
  const v = c.max * (L > 20 ? 0.97 : 0.9), tEnd = t0 + 0.1 + L / v;
  S.when(t0, () => { c.brain = B.carry(pts.slice(1), t0, tEnd, c.max); });
  marks.forEach(({ e, p }, i) => { // each whiff
    const t = t0 + 0.1 + at[i + 1] / v, d = S.by[e.def];
    S.when(t - 0.3, (s) => s.setPose(c, MOVE[e.move] || 'juke', 0.4));
    if (d) S.when(Math.max(S.T0, t - 1.4), (s) => { d.pose = null; d.brain = B.meet(p[0] + S.dir * 0.6, p[1] + (i % 2 ? -0.9 : 0.9), t, d.max * 1.05, (a, ss) => { ss.setPose(a, 'tackle', 0.25); ss.when(ss.t + 0.2, () => ss.knock(a, 1.3)); }); });
  });
  finishCarry(S, c, end, tEnd, { tk: made && S.by[made.def], td: play.result.td, oob: play.result.oob, fumble: ev(play, 'fumble')[0] });
  return tEnd;
}

export function buildRun(S, lineups, gainOverride) {
  const play = S.play, sneak = play.call?.sub === 'sneak' || play.call?.name === 'QB Sneak', { A, D } = lineup(S, lineups, { under: sneak || play.kind === 'two', huddle: true });
  const hand = ev(play, 'handoff')[0], qb = A.QB, c = (hand && S.by[hand.to]) || A.RB, gain = gainOverride ?? play.result.gain, T0 = S.T0;
  const blocks = Object.fromEntries(ev(play, 'block').map((e) => [e.def, e.move]));
  S.when(T0, (s) => s.give(qb));
  lineFight(S, A, D, false, { blocks, carrier: c });
  if (c === qb && (sneak || play.kind === 'two' || !A.RB)) { // QB sneak: he takes it and drives straight into the pile behind his center
    S.when(T0 + 0.15, (s) => s.setPose(qb, 'drive'));
    qb.brain = B.path([S.at(-1.2, 0), S.at(Math.max(gain, -0.5) + 0.2, 0.2)], T0 + 0.1, T0 + 1.4, qb.max * 0.6);
    S.when(T0 + 1.45, (s) => { s.knock(qb, 1.6); }); S.tEnd = T0 + 1.5; return;
  }
  const side = /left/.test(hand?.gap || '') ? -1 : 1, outside = /outside/.test(hand?.gap || ''), under = Math.abs(S.along(qb)) < 3;
  const mesh = S.at(under ? -3.6 : -4.2, side * 0.8), tMesh = T0 + (under ? 0.6 : 0.5);
  const keeper = c === qb, rb = A.RB;   // keeper: an option read where the quarterback pulls it and runs
  qb.brain = B.path([S.at(under ? -3.1 : -4.4, side * 0.3)], T0, tMesh, qb.max);
  if (!keeper) c.brain = B.path([mesh], T0 + 0.05, tMesh, c.max); else if (rb) rb.brain = B.path([mesh], T0 + 0.05, tMesh, rb.max);
  S.when(tMesh, (s) => {
    if (!keeper) { s.give(c); qb.brain = B.to(qb.x - S.dir * 1.5, qb.y - side * 4, 4.5); }   // the fake
    else if (rb) rb.brain = B.to(rb.x + S.dir * 4, rb.y - side * 2, rb.max * 0.8);             // the back carries out the fake
  });
  const holeLat = outside ? side * (6 + S.rand() * 3) : side * (0.8 + S.rand() * 1.8), endLat = holeLat + (S.rand() - 0.5) * (outside ? 8 : 5);
  const from = gain > 0.6 ? S.at(Math.min(0.6, gain), holeLat) : mesh;
  S.when(tMesh, () => { c.brain = B.path([from], tMesh, tMesh + dist(mesh[0], mesh[1], from[0], from[1]) / (c.max * 0.85), c.max); });
  const t1 = tMesh + dist(mesh[0], mesh[1], from[0], from[1]) / (c.max * 0.85);
  S.tEnd = carryPath(S, c, from, t1, gain, endLat, play);
  if (A.TE) A.TE.brain = (a, dt, s) => { if (s.t > T0 && D.LB2) { s.setPose(a, 'drive'); stepToward(a, D.LB2, dt, s); } };
  for (const [w, cb] of [[A.WR1, D.CB1], [A.WR2, D.CB2]]) if (w && cb) w.brain = (a, dt, s) => { if (s.t > T0 + getGoing(a.p)) { if (dist(a.x, a.y, cb.x, cb.y) < 1.5) s.setPose(a, 'block'); stepToward(a, cb, dt, s); } };
  pursueAll(S, c, tMesh + 0.35, [A.WR1, A.WR2, A.TE].map((w) => w && D[{ WR1: 'CB1', WR2: 'CB2' }[w.key]]).filter(Boolean));
  S.when(tMesh + 0.35, (s) => { for (const k of ['CB1', 'CB2']) if (D[k]) { D[k].pose = null; D[k].brain = B.pursue(c, D[k].max * 0.75, 1.5); } });
}
function stepToward(a, t, dt, s) { const k = s.dir; const tx = t.x - k * 1, ty = t.y; const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy); if (d > 0.05) { const m = Math.min(d, a.max * 0.7 * dt); a.x += (dx / d) * m; a.y += (dy / d) * m; } }

// The QB drops, feels it, escapes the pocket and takes off.
export function buildScramble(S, lineups) {
  const play = S.play, { A, D } = lineup(S, lineups, { huddle: true }), qb = A.QB, T0 = S.T0;
  S.when(T0, (s) => s.give(qb));
  const esc = ev(play, 'pocket').find((e) => e.move === 'escape'), tEsc = T0 + clamp(esc?.t ?? 1.8, 1.2, 4), side = S.rand() < 0.5 ? -1 : 1;
  qb.brain = B.path([S.at(-7, 0), S.at(-5.5, side * 4)], T0, tEsc, qb.max);
  lineFight(S, A, D, true, { qb });
  for (const k of ['WR1', 'WR2', 'TE']) if (A[k]) A[k].brain = B.path([S.at(12, A[k].y), S.at(18, A[k].y * 0.7)], T0 + 0.1, T0 + 3, A[k].max * 0.85);
  for (const [r, d] of [['WR1', 'CB1'], ['WR2', 'CB2'], ['TE', 'SS']]) if (A[r] && D[d]) D[d].brain = (a, dt, s) => { if (s.t > T0) { const dx = A[r].x + S.dir * 1.2 - a.x, dy = A[r].y - a.y, m = Math.hypot(dx, dy); if (m > 0.05) { const st = Math.min(m, a.max * dt); a.x += (dx / m) * st; a.y += (dy / m) * st; } } };
  pursueAll(S, qb, tEsc, []);
  S.tEnd = carryPath(S, qb, S.at(-5.5, side * 4), tEsc, play.result.gain, side * (8 + S.rand() * 10), play);
}

export function buildKneel(S, lineups) {
  const { A } = lineup(S, lineups, { under: true, huddle: true }), qb = A.QB;
  S.when(S.T0, (s) => s.give(qb)); S.when(S.T0 + 0.3, (s) => { qb.brain = B.to(qb.x - S.dir * 0.8, qb.y, 2); s.setPose(qb, 'kneel'); });
  S.when(S.T0 + 0.25, (s) => { for (const a of s.actors) if (a !== qb) a.pose = 'stand'; });
  S.tEnd = S.T0 + 1;
}

// A spike: under center, snap, and throw it straight into the ground to stop the clock.
export function buildSpike(S, lineups) {
  const { A } = lineup(S, lineups, { under: true, huddle: false }), qb = A.QB;
  S.when(S.T0, (s) => s.give(qb));
  S.when(S.T0 + 0.3, (s) => { for (const a of s.actors) if (a !== qb) a.pose = 'stand'; });
  S.when(S.T0 + 0.35, (s) => { s.setPose(qb, 'throw', 0.6); });
  S.when(S.T0 + 0.6, (s) => { s.loose(S.dir * 3, 0, -5); });
  S.tEnd = S.T0 + 1.4;
}
