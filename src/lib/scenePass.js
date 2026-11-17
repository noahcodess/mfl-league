// Pass plays on the field. The QB takes the snap and drops with the ball by his ear; receivers run real routes at their own
// speed, plant at the break and keep working after it; each defender shadows his man at the cushion the engine gave him
// (so how open a receiver looks is how open he was); rushers who win get to the QB on their own legs. Then the throw:
// a bullet, touch or a lob, and the catch, drop, breakup, pick or miss exactly as the report says.
import { B, clamp, dist, getGoing, stepTo } from './sceneCore.js';
import { lineup, lineFight, pursueAll, finishCarry, ev, COVER } from './sceneLineup.js';
import { carryPath } from './sceneCarry.js';
import { routeFor } from './sceneRoutes.js';

const DEPTH = { quick: { WR1: 5, WR2: 4, TE: 4, RB: 1 }, short: { WR1: 8, WR2: 7, TE: 6, RB: 2 }, medium: { WR1: 15, WR2: 12, TE: 9, RB: 3 }, deep: { WR1: 28, WR2: 22, TE: 14, RB: 3 } };
// Chase the QB so he gets there right at tArrive, never faster than his own top speed.
const timedChase = (qb, tArrive) => (a, dt, s) => stepTo(a, qb.x, qb.y, Math.min(a.max, dist(a.x, a.y, qb.x, qb.y) / Math.max(0.05, tArrive - s.t)), dt);

export function buildPass(S, lineups) {
  const play = S.play, { A, D } = lineup(S, lineups, { huddle: true }), qb = A.QB, T0 = S.T0, dir = S.dir;
  const thr = ev(play, 'throw')[0], cat = ev(play, 'catch')[0], sackEv = ev(play, 'pressure').find((e) => e.kind === 'sack'), hurry = ev(play, 'pressure').find((e) => e.kind === 'hurry');
  const read = Object.fromEntries((ev(play, 'read')[0]?.open || []).map((o) => [o.id, o])), depths = DEPTH[play.call?.sub] || DEPTH.short;
  const rush = Object.fromEntries(ev(play, 'rush').map((e) => [e.def, e.t]));
  S.when(T0, (s) => s.give(qb));
  const drop = S.at(play.call?.sub === 'quick' ? -6 : -7.3, 0), tDrop = T0 + 0.85;
  qb.brain = B.path([drop], T0, tDrop, qb.max); qb.backUntil = tDrop;
  if (play.call?.pa && A.RB) { // play action: he turns and sticks the ball in the back's belly, the back carries out the fake
    const side = S.rand() < 0.5 ? -1 : 1, mesh = S.at(-3.4, side * 0.9);
    qb.brain = B.path([S.at(-3.0, side * 0.5), drop], T0, tDrop + 0.35, qb.max); qb.backUntil = tDrop + 0.35;
    S.when(T0 + 0.4, (s) => s.setPose(qb, 'reach', 0.4));
    if (thr?.target !== A.RB.id) A.RB.brain = B.path([mesh, S.at(1.2, side * 2)], T0, T0 + 1.2, A.RB.max * 0.9);
  }
  const tgtKey = Object.keys(COVER).find((k) => A[k]?.id === thr?.target) || 'WR1', tgt = thr && !thr.away ? A[tgtKey] : null;   // a sub who isn't drawn: his spot's starter stands in
  let tThrow = T0 + clamp(thr?.t ?? 2.4, 0.9, 6.2), catchAt = null, tCatch = null;
  for (const [rk, ck] of Object.entries(COVER)) { // routes: everyone runs his own; the target's last point is where the ball goes
    const r = A[rk]; if (!r) continue;
    const info = read[r.id], mine = r === tgt, l0 = r.y, a0 = S.along(r);
    const pts = routeFor(play.call?.concept, rk, l0, mine ? thr.air : info?.depth ?? depths[rk], play.n + rk.length).map(([al, lat]) => S.at(al, lat));   // the play's real route
    if (mine && play.result.oob) { const e = pts[pts.length - 1], sg = Math.sign(l0 || 1); e[1] = sg * Math.max(sg * e[1], 22.4 + S.rand() * 1.8); }   // a catch that goes out of bounds was made near the sideline
    let L = dist(r.x, r.y, pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    const go0 = T0 + getGoing(r.p), arrive = go0 + L / (r.max * 0.95), toBreak = dist(r.x, r.y, pts[0][0], pts[0][1]) / (r.max * 0.95);
    if (mine) {
      catchAt = pts[pts.length - 1];
      const flight = dist(drop[0], drop[1], catchAt[0], catchAt[1]) / (thr.air > 20 ? 19 : 23) + 0.2;
      tCatch = Math.max(tThrow + flight, arrive); tThrow = Math.max(tDrop, tCatch - flight);   // never faster than his legs
      r.brain = B.path(pts, go0, tCatch, r.max);
      if (pts.length > 1) S.when(go0 + toBreak * ((tCatch - go0) / Math.max(0.1, arrive - go0)) - 0.12, (s) => s.setPose(r, 'cut', 0.24));
    } else { // after his route he keeps working the way he was headed (or settles in a hole)
      const last = pts[pts.length - 1], prev = pts[pts.length - 2] || [r.x, r.y], ux = last[0] - prev[0], uy = last[1] - prev[1], m = Math.hypot(ux, uy) || 1;
      const settle = Math.abs(S.along({ x: last[0] }) - a0) < 7 && Math.abs(uy) < 2;
      const more = settle ? [last[0] - dir * 0.6, last[1] - Math.sign(l0 || 1) * 1.5] : [last[0] + (ux / m) * 8, clamp(last[1] + (uy / m) * 8, -25, 25)];
      r.brain = B.path([...pts, more], go0, arrive + (settle ? 1.2 : 8 / (r.max * 0.85)), r.max);
      if (pts.length > 1) S.when(go0 + toBreak - 0.12, (s) => s.setPose(r, 'cut', 0.24));
    }
    const cv = D[ck]; if (!cv) continue;
    const sep = clamp(mine && cat?.sep != null ? cat.sep : info?.sep ?? 1.4, 0.3, 6), side = (l0 >= 0 ? 1 : -1) * Math.min(1.2, sep * 0.5), trail = dir * (sep * 0.85 - 0.3);
    if (rk !== 'RB') cv.backUntil = T0 + 0.7;
    cv.brain = (a, dt, s) => { if (s.t < T0 + 0.08) return; if (s.t < T0 + 0.7 && rk !== 'RB') { stepTo(a, a.x + dir * 2, a.y, a.max * 0.55, dt); return; } B.shadow(r, trail, side, a.max * 1.02)(a, dt); };
  }
  if (D.LB2) D.LB2.brain = rush[D.LB2.id] != null ? B.pursue(qb, D.LB2.max * 0.9, 0.6) : B.path([S.at(7, D.LB2.y * 0.6)], T0 + 0.1, T0 + 1.6, D.LB2.max);
  const contact = {};   // who reaches the QB, and when: the sack, or the hit as he lets it go
  if (sackEv) contact[sackEv.by] = T0 + clamp(sackEv.t, 1.2, 6.2);
  if (hurry && thr?.pressured) contact[hurry.by] = tThrow + 0.1;
  lineFight(S, A, D, true, { rush, qb, contact, throwAt: thr ? tThrow : null });
  S.tThrow = tThrow; S.tCatch = tCatch; S.catchAt = catchAt;
  if (sackEv) return sack(S, play, qb, sackEv);
  const pk = ev(play, 'pocket')[0];   // the pocket moves: climb, slide, roll out on a boot, or bail when it takes too long
  const sd = tgt ? (tgt.y >= 0 ? 1 : -1) : S.rand() < 0.5 ? -1 : 1;
  if (pk?.move === 'rollout') { S.when(Math.max(tDrop - 0.3, T0 + 0.5), () => { qb.brain = B.to(drop[0] + dir * 1.5, sd * 9, qb.max * 0.85); }); }   // rolls out and throws on the run
  else if (pk?.move === 'step up') S.when(tThrow - 0.8, () => { qb.brain = B.to(drop[0] + dir * 1.8, drop[1], 4.2); });
  else if (pk?.move === 'slide' || tThrow - T0 > 3.6) { S.when(Math.max(tDrop, tThrow - 1.2), () => { qb.brain = B.to(drop[0] - dir * 0.5, sd * 3.8, 5.2); }); }
  const pump = ev(play, 'pump')[0];   // the pump fake (the camera bites a little too)
  if (pump) { const tp = Math.max(tDrop, T0 + pump.t); S.when(tp, (s) => s.setPose(qb, 'pump', 0.4)); S.pumpAt = tp; }
  if (hurry && thr?.pressured) { const by = S.by[hurry.by]; if (by) { S.when(Math.max(T0 + 0.4, tThrow - 1.3), () => { by.pose = null; by.brain = timedChase(qb, tThrow + 0.1); }); S.when(tThrow + 0.12, (s) => { if (dist(by.x, by.y, qb.x, qb.y) < 2.5) { s.knock(qb, 1.6); s.knock(by, 1.4); } }); } }
  if (!thr) { S.tEnd = tThrow; return; }
  S.when(tThrow - 0.3, (s) => s.setPose(qb, 'throw', 0.6));
  const wob = { wobble: !!(thr.pressured && hurry) };
  if (thr.away) { S.when(tThrow, (s) => { const sd = qb.y >= 0 ? 1 : -1; s.throwBall(qb.x + dir * 9, sd * 28.5, 0.15, 1.1, 3, (ss) => ss.loose(dir * 4, sd * 2, 2), wob); }); S.tEnd = tThrow + 1.2; return; }
  outcome(S, play, tgt, cat, catchAt, tThrow, tCatch, wob);
}

function outcome(S, play, tgt, cat, at, tThrow, tCatch, wob) {
  const dir = S.dir, res = cat?.result, d = play.events.find((e) => e.type === 'throw').air, arc = d <= 12 ? 0.9 + d * 0.07 : d <= 22 ? 1.4 + d * 0.1 : 2.4 + d * 0.15;
  const df = cat && S.by[cat.def], high = d > 15 || cat?.contested;
  S.when(tCatch - 0.3, (s) => s.setPose(tgt, high ? 'catch' : 'reach', 0.42));
  if (res === 'miss') { // off target, the way the call says
    const why = cat.why || 'overthrown', [dx, dy, h] = { overthrown: [dir * 5, 0, 0.5], 'too high': [dir * 3, 0, 2.8], 'behind him': [-dir * 2.5, 0, 0.4], 'out of reach': [dir * 0.8, (at[1] >= 0 ? 1 : -1) * 3.2, 0.4] }[why] || [dir * 4, 0, 0.5];
    S.when(tThrow, (s) => s.throwBall(at[0] + dx, clamp(at[1] + dy, -28, 28), h, tCatch - tThrow + 0.15, arc, (ss) => ss.loose(dir * 3, 0, 1.5), wob));
    if (why === 'out of reach') S.when(tCatch - 0.1, (s) => { tgt.brain = B.to(tgt.x + dir * 0.4, tgt.y + (at[1] >= 0 ? 1.5 : -1.5), 6); s.when(s.t + 0.15, () => s.knock(tgt, 1.3)); });
    else S.when(tCatch + 0.4, (s) => s.setPose(tgt, 'drop', 1.5));
    S.tEnd = tCatch + 0.6; return;
  }
  if (res === 'int') { // the defender jumps the route and takes it
    const spot = [at[0] - dir * 0.7, at[1]], end = [play.after.poss === 'away' ? play.after.ballOn : 100 - play.after.ballOn, clamp(at[1] * 0.6, -24, 24)];
    if (df) S.when(tThrow, () => { df.brain = B.meet(spot[0], spot[1], tCatch, df.max * 1.15); });
    S.when(tThrow, (s) => s.throwBall(spot[0], spot[1], 0.6, tCatch - tThrow, arc, (ss) => { if (df) { ss.give(df); ss.setPose(df, 'catch', 0.3); } }, wob));
    const tEnd = tCatch + 0.1 + (df ? dist(spot[0], spot[1], end[0], end[1]) / (df.max * 0.9) : 1);
    if (df) { S.when(tCatch + 0.05, () => { df.brain = B.path([end], tCatch, tEnd, df.max); }); pursueAll(S, df, tCatch + 0.1, []); finishCarry(S, df, end, tEnd, { tk: tgt, td: play.result.td }); }
    S.tEnd = tEnd; return;
  }
  S.when(tThrow, (s) => s.throwBall(at[0], at[1], 0.62, tCatch - tThrow, arc, (ss) => {
    if (res === 'catch') { ss.give(tgt); return; }
    if (res === 'breakup') { ss.loose(-dir * 2, (at[1] >= 0 ? 1 : -1) * 3, 4.5); return; }
    ss.loose(dir * 1.5, (ss.rand() - 0.5) * 2, 3.5);   // drop: it pops off his hands
  }, wob));
  if (res === 'breakup' && df) { S.when(tThrow, () => { df.brain = B.meet(at[0] + dir * 0.5, at[1] + (at[1] >= 0 ? 0.7 : -0.7), tCatch - 0.03, df.max * 1.15); }); S.when(tCatch - 0.22, (s) => s.setPose(df, 'catch', 0.35)); }
  if (res !== 'catch') { S.when(tCatch + 0.15, (s) => { tgt.brain = B.to(tgt.x + dir * 1.2, tgt.y, 2); s.setPose(tgt, 'drop', 1.6); }); S.tEnd = tCatch + 0.6; return; }
  S.tEnd = carryPath(S, tgt, at, tCatch, play.result.gain, clamp(at[1] + (S.rand() - 0.5) * 8, -25, 25), play);   // run after the catch, broken tackles and all
  pursueAll(S, tgt, tCatch, []);
}

// The rusher (or blitzer) who got home runs the QB down on his own legs; the QB drifts to where it happens.
function sack(S, play, qb, e) {
  const tS = S.T0 + clamp(e.t, 1.2, 6.2), by = S.by[e.by], spot = S.at(play.result.gain - 0.5, (S.rand() - 0.5) * 3);
  S.when(Math.max(S.T0 + 1, tS - 1), () => { qb.brain = B.to(spot[0], spot[1], 3); });
  if (by) S.when(Math.max(S.T0 + 0.4, tS - 1.6), () => { by.pose = null; by.brain = timedChase(qb, tS); });
  S.when(tS - 0.2, (s) => s.setPose(by, 'tackle', 0.3));
  S.when(tS, (s) => { s.knock(qb, 1.8); if (by && dist(by.x, by.y, qb.x, qb.y) < 3) s.knock(by, 1.5); for (const a of s.actors) if (!a.down && a !== by && dist(a.x, a.y, qb.x, qb.y) < 12) { a.pose = null; a.brain = B.gather(s, qb.x, qb.y, 2); } });
  S.tEnd = tS + 0.2;
}
