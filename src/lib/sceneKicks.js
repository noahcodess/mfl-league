// Kicking plays on the field: kickoffs (ball on a tee, the kicker's run-up, the coverage sprinting down, the return and
// the tackle), punts (snap, kick, gunners, fair catch or return), and field goals and extra points (snap, hold, kick through
// the uprights or wide). Everyone moves at his own speed; the tackler is whoever really gets there.
import { B, clamp, dist } from './sceneCore.js';
import { frame, pursueAll, finishCarry, ev } from './sceneLineup.js';

const row = (n, w = 34) => Array.from({ length: n }, (_, i) => -w / 2 + (w * i) / Math.max(1, n - 1));
const absOf = (side, ballOn) => (side === 'away' ? ballOn : 100 - ballOn);

// A return after the catch: returner runs to `end`, the coverage chases, his blockers pick men off.
function runBack(S, ret, from, end, tCatch, cover, blockers, td) {
  const L = dist(from[0], from[1], end[0], end[1]), mid = [(from[0] + end[0]) / 2, clamp((from[1] + end[1]) / 2 + (S.rand() - 0.5) * 8, -24, 24)];
  const tEnd = tCatch + 0.15 + L / (ret.max * 0.9);
  S.when(tCatch, () => { ret.brain = B.path([mid, end], tCatch, tEnd, ret.max); });
  pursueAll(S, ret, tCatch - 0.3, []);
  S.when(tCatch - 0.3, (s) => blockers.forEach((b, i) => { const m = cover[i % cover.length]; if (m) b.brain = (a, dt) => { const k = s.dir; if (dist(a.x, a.y, m.x, m.y) < 1.4) s.setPose(a, 'block'); const dx = m.x + k * 1 - a.x, dy = m.y - a.y, d = Math.hypot(dx, dy); if (d > 0.05) { const st = Math.min(d, a.max * 0.85 * dt); a.x += (dx / d) * st; a.y += (dy / d) * st; } }; }));
  finishCarry(S, ret, end, tEnd, { td });
  return tEnd;
}

export function buildKickoff(S, lineups) {
  const play = S.play, kick = lineups[play.off].kickTeams.kickoff, rec = lineups[play.def].kickTeams.kickReturn, retEv = ev(play, 'ret')[0];
  const from = play.before.ballOn > 0 ? 35 : 35; frame(S, play, play.off === 'away' ? from : 100 - from); S.lines = null;
  const dir = S.dir, T0 = (S.T0 = 3.2); S.tee = { x: S.los, y: 0, t1: T0 };
  const K = S.add(kick.kicker, play.off, ...S.at(-9, -1.5), dir), cover = kick.players.slice(1).map((p, i) => S.add(p, play.off, ...S.at(-6, row(kick.players.length - 1)[i]), dir));
  const ret = S.add(rec.returner, play.def, ...S.at(60, 0), -dir), blockers = rec.players.slice(1).map((p, i) => S.add(p, play.def, ...S.at(i < 5 ? 12 : 35, row(5, 30)[i % 5]), -dir, 'lbset'));
  S.ball.x = S.los; S.ball.y = 0; S.ball.h = 0.22;
  K.brain = B.path([S.at(-0.5, -0.2)], T0 - 1.6, T0, K.max * 0.8); cover.forEach((c) => { c.brain = B.path([S.at(-0.6, c.y)], T0 - 1.5, T0, c.max * 0.9); });
  S.when(T0 - 0.12, (s) => s.setPose(K, 'kick', 0.5));
  if (play.onside) {
    const land = S.at(11, (S.rand() - 0.5) * 6), got = play.headline === 'ONSIDE RECOVERED';
    S.when(T0, (s) => s.throwBall(land[0], land[1], 0.12, 1.1, 1.2, (ss) => ss.loose(dir * 1.5, 0, 2.5), { kick: true }));
    [...cover, ...blockers].forEach((a) => { a.brain = (b, dt, s) => { if (s.t > T0 + 0.1) { const dx = land[0] - b.x, dy = land[1] - b.y, d = Math.hypot(dx, dy); if (d > 1.2) { const st = Math.min(d, b.max * 0.8 * dt); b.x += (dx / d) * st; b.y += (dy / d) * st; } } }; });
    const win = got ? cover[2] : blockers[0]; S.when(T0 + 1.7, (s) => { if (win) win.brain = B.meet(s.ball.x, s.ball.y, s.t + 0.35, win.max, (a, ss) => { ss.knock(a); ss.give(a); }); });
    S.tEnd = T0 + 2.4; return;
  }
  const oob = ev(play, 'kick')[0]?.oob, endRcv = play.result.td ? 100 : play.after.ballOn, retYds = retEv?.yards ?? 0, landOn = oob ? 6 : retEv ? endRcv - retYds : -4, hang = 3.4;
  const landAbs = absOf(play.def, landOn), landY = oob ? (S.rand() < 0.5 ? -28 : 28) : clamp((S.rand() - 0.5) * 12, -20, 20);   // a hooked kick lands out of bounds
  ret.x = landAbs - dir * 2; ret.y = landY;
  S.when(T0, (s) => s.throwBall(landAbs, landY, retEv ? 0.62 : 0.12, hang, 13, (ss) => { if (retEv) ss.give(ret); else ss.loose(dir * 2, 0, 2); }, { kick: true }));
  ret.brain = B.path([[landAbs, landY]], T0 + 1, T0 + hang - 0.05, ret.max);
  S.when(T0 + 0.1, (s) => cover.forEach((c) => { c.brain = B.to(landAbs - dir * (10 + s.rand() * 8), clamp(c.y * 0.7, -25, 25), c.max * 0.92); }));
  if (!retEv) { S.when(T0 + hang + 0.2, (s) => s.setPose(ret, 'kneel')); S.tEnd = T0 + hang + 0.6; return; }
  const end = [absOf(play.def, play.result.td ? 102 : endRcv), clamp(landY + (S.rand() - 0.5) * 14, -24, 24)];
  S.tEnd = runBack(S, ret, [landAbs, landY], end, T0 + hang, cover, blockers, play.result.td);
}

export function buildPunt(S, lineups) {
  const play = S.play, me = lineups[play.off].kickTeams.punt, them = lineups[play.def].kickTeams.puntReturn, kick = ev(play, 'kick')[0], retEv = ev(play, 'ret')[0];
  frame(S, play); const dir = S.dir, T0 = S.T0; S.lines = null;
  const P = S.add(me.punter, play.off, ...S.at(-14, 0), dir), line = me.players.slice(1).map((p, i) => S.add(p, play.off, ...S.at(-1.5, i < 2 ? (i ? 19 : -19) : row(me.players.length - 3, 12)[i - 2]), dir, i < 2 ? 'wrset' : 'olset'));
  const rush = them.players.slice(1).map((p, i) => S.add(p, play.def, ...S.at(1.6, row(them.players.length - 1, 22)[i]), -dir, 'dlset'));
  const gross = kick?.dist ?? 44, landAl = Math.min(gross, 100 - play.before.ballOn + 6), land = S.at(landAl, kick?.shank ? (S.rand() < 0.5 ? -28 : 28) : clamp((S.rand() - 0.5) * 14, -20, 20));
  const ret = S.add(them.returner, play.def, land[0] + dir * 3, land[1], -dir);
  S.ball.x = S.los; S.ball.y = 0;
  S.when(T0, (s) => s.throwBall(P.x, P.y, 0.62, 0.55, 0.3, (ss) => ss.give(P)));
  const tKick = T0 + 1.35, hang = kick?.hang ?? 4, tLand = tKick + hang;
  S.when(tKick - 0.15, (s) => s.setPose(P, 'kick', 0.5));
  S.when(tKick, (s) => s.throwBall(land[0], land[1], retEv ? 0.62 : 0.12, hang, 15, (ss) => { if (retEv) ss.give(ret); else ss.loose(dir * 3, 0, 3); }, { kick: true }));
  ret.brain = B.path([land], T0 + 1.5, tLand - 0.05, ret.max);
  line.forEach((a, i) => { a.brain = B.path([S.at(landAl - 4 - (i % 4) * 2, land[1] + (i - 4) * 2.2)], i < 2 ? T0 : tKick + 0.2, tLand + 0.3, a.max * 0.95); });
  rush.forEach((a) => { a.brain = B.path([S.at(-3, a.y * 0.6)], T0 + 0.1, tKick + 0.4, a.max * 0.6); });
  if (!retEv) { S.tEnd = tLand + 0.8; return; }
  if (retEv.fair) { S.when(tLand - 0.6, (s) => s.setPose(ret, 'catch', 0.6)); S.when(tLand + 0.2, (s) => s.setPose(ret, 'kneel')); S.tEnd = tLand + 0.5; return; }
  const endRcv = play.result.td ? 102 : play.after.ballOn, end = [absOf(play.def, endRcv), clamp(land[1] + (S.rand() - 0.5) * 12, -24, 24)];
  S.tEnd = runBack(S, ret, land, end, tLand, line, rush, play.result.td);
}

// Field goals and extra points: snap, hold, kick; through the uprights or wide.
export function buildKick(S, lineups) {
  const play = S.play, u = lineups[play.off].kickTeams.fieldGoal, blk = lineups[play.def].kickTeams.fieldGoalBlock, kick = ev(play, 'kick')[0];
  frame(S, play, play.kind === 'xp' ? (play.off === 'away' ? 85 : 15) : undefined); const dir = S.dir, T0 = S.T0; S.lines = null;
  const holder = S.add(u.holder || u.players[1], play.off, ...S.at(-7, 0), dir, 'kneel'), K = S.add(u.kicker, play.off, ...S.at(-9.5, -2.2), dir);
  u.players.slice(2).forEach((p, i, l) => S.add(p, play.off, ...S.at(-1.3, -6 + (12 * i) / Math.max(1, l.length - 1)), dir, 'olset'));
  blk.players.slice(0, 9).forEach((p, i) => { const a = S.add(p, play.def, ...S.at(1.6, -6 + 1.5 * i), -dir, 'dlset'); if (a) a.brain = B.path([S.at(0.4, a.y * 0.9)], T0, T0 + 1.2, 1.4); });
  if (holder) holder.idle = 'kneel';
  S.ball.x = S.los; S.ball.y = 0;
  S.when(T0, (s) => s.throwBall(holder.x + dir * 0.4, holder.y, 0.3, 0.35, 0.2, () => {}));
  const tKick = T0 + 1.05, goalX = dir > 0 ? 110 : -10;
  K.brain = B.path([S.at(-7.6, -0.4)], T0 + 0.35, tKick, K.max * 0.7);
  S.when(tKick - 0.12, (s) => s.setPose(K, 'kick', 0.5));
  const good = kick?.good, dur = Math.max(0.9, Math.abs(goalX - S.los) / 21), y1 = good ? (S.rand() - 0.5) * 2 : (S.rand() < 0.5 ? -1 : 1) * (4.5 + S.rand() * 2);
  S.when(tKick, (s) => s.throwBall(goalX + dir * 2, y1, good ? 4 : 2, dur, Math.min(9, Math.abs(goalX - S.los) * 0.2), (ss) => ss.loose(dir * 2, 0, -1), { kick: true }));
  S.tEnd = tKick + dur;
}
