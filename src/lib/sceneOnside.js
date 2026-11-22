// Onside kicks on the field, acted out from the engine's 'onside' event (simOnside): the formation for the call (balanced,
// stacked to one side, or spread wide for the kicker's kick-and-chase), the kick itself as a chain of real bounces (a
// low drive that kicks up into a big hop, dribblers and rollers that curve toward a sideline, a top-spin skipper, a squib,
// a pop-up over the front line, a straight poke the kicker chases), everyone converging, and the finish: a dive on it or a
// catch on the hop, a pile, the receiving team sliding down or getting dropped, the kicker diving at the 10, and the
// official's flag when a kicker touches it before it has gone 10 yards. It always ends where the engine says.
import { B, clamp, dist } from './sceneCore.js';
import { frame } from './sceneLineup.js';

const spread = (lats) => lats.map((l) => clamp(l, -24, 24));
// The kick's bounces for each call: [yards downfield (fraction of the full distance), share of the sideways drift, bounce height, seconds].
const PATHS = {
  hop: [[0.42, 0.35, 0.1, 0.32], [1, 1, 3.1, 1.05]],
  dribble: [[0.25, 0.2, 0.28, 0.28], [0.48, 0.45, 0.32, 0.34], [0.68, 0.7, 0.24, 0.34], [0.84, 0.88, 0.18, 0.34], [1, 1, 0.12, 0.38]],
  topspin: [[0.28, 0.2, 0.1, 0.26], [0.55, 0.55, 0.32, 0.32], [1, 1, 2.2, 0.75]],
  squib: [[0.3, 0.3, 0.42, 0.3], [0.62, 0.62, 0.55, 0.36], [0.88, 0.88, 0.36, 0.36], [1, 1, 0.24, 0.36]],
  pop: [[1, 1, 6.6, 1.55]],
  curve: [[0.2, -0.25, 0.22, 0.28], [0.42, -0.1, 0.26, 0.32], [0.62, 0.25, 0.24, 0.34], [0.82, 0.65, 0.18, 0.34], [1, 1, 0.12, 0.38]],
  chase: [[0.25, 0.25, 0.36, 0.36], [0.5, 0.5, 0.42, 0.44], [0.75, 0.75, 0.34, 0.48], [1, 1, 0.22, 0.5]],
};
const pathOf = (k) => (k.startsWith('dribble') || k === 'overload' || k === 'fake' ? 'dribble' : k.startsWith('curve') ? 'curve' : k);
const AIR = new Set(['hop', 'pop', 'topspin']);   // ends with the ball in the air: caught on the hop

// S: the scene. lineups: both teams. e: the engine's onside event.
export function buildOnside(S, lineups, e) {
  const play = S.play, kick = lineups[play.off].kickTeams.kickoff, rec = lineups[play.def].kickTeams.kickReturn;
  frame(S, play, play.off === 'away' ? 35 : 65); S.lines = null;
  const dir = S.dir, T0 = (S.T0 = 3.2), k = e.kind, side = k.endsWith('_r') ? 1 : k.endsWith('_l') ? -1 : e.lat >= 0 ? 1 : -1;
  S.tee = { x: S.los, y: 0, t1: T0 };
  // Where it ends up sideways: rollers and curves go toward a sideline, the poke goes straight, the hop wherever the engine says.
  const latR = k === 'chase' ? clamp(e.lat * 0.15, -1.5, 1.5) : ['squib'].includes(k) ? clamp(e.lat * 0.3, -3, 3) : pathOf(k) === 'dribble' || pathOf(k) === 'curve' ? side * (9 + Math.abs(e.lat) * 0.6) : e.lat;
  const coverLats = k === 'chase' ? [-24, -20, -16, -12, -8, 8, 12, 16, 20, 24]
    : k === 'overload' || pathOf(k) !== 'dribble' && pathOf(k) !== 'curve' ? (k === 'overload' ? [2, 5, 8, 11, 14, 17, 20, -7, -14, -21].map((l) => l * side) : [-22, -17, -12, -7, -3, 3, 7, 12, 17, 22])
      : [1, 4, 7, 10, 13, 16, 20, -8, -15, -22].map((l) => l * side);
  const K = S.add(kick.kicker, play.off, ...S.at(k === 'fake' ? -6.5 : -7.5, k === 'fake' ? 4 * side : -1.2), dir);
  const cover = kick.players.filter((p) => p && p !== kick.kicker).slice(0, 10).map((p, i) => S.add(p, play.off, ...S.at(-5.5, spread(coverLats)[i] ?? 0), dir)).filter(Boolean);
  const front = [-18, -11, -5, 0, 5, 11, 18], back = [-12, 0, 12];
  const hands = rec.players.filter(Boolean).map((p, i) => S.add(p, play.def, ...(i < 7 ? S.at(11, front[i]) : i < 10 ? S.at(18, back[i - 7]) : S.at(30, 0)), -dir, 'lbset')).filter(Boolean);
  const all = [...cover, ...hands], winner = S.by[e.by] || (e.got || e.illegal ? cover[0] : hands[0]);
  // Put the man who comes up with it in the lane where it's going (swap spots with whoever lined up there).
  const lane = (e.got || e.illegal ? cover : hands).filter((a) => a !== winner).sort((a, b) => Math.abs(a.y - latR) - Math.abs(b.y - latR))[0];
  if (lane && winner && winner !== K && Math.abs(lane.y - latR) < Math.abs(winner.y - latR)) { const y = winner.y; winner.y = lane.y; lane.y = y; }
  S.ball.x = S.los; S.ball.y = 0; S.ball.h = 0.22;
  K.brain = B.path([S.at(-0.4, k === 'fake' ? -0.6 * side : -0.2)], T0 - 1.6, T0, K.max * 0.8);
  cover.forEach((c) => { c.brain = B.path([S.at(-0.8, c.y)], T0 - 1.5, T0, c.max * 0.85); });
  S.when(T0 - 0.12, (s) => s.setPose(K, 'kick', 0.45));

  // The kick: a chain of bounces, each one starting where the last came down.
  const legs = PATHS[pathOf(k)], air = AIR.has(k), lastH = air ? 1.5 : 0.12;
  const pts = legs.map(([fd, fl, ap, dur], i) => { const [x, y] = S.at(e.d * fd, latR * fl); return { x, y, ap, dur, h: i === legs.length - 1 ? lastH : 0.12 }; });
  const tRec = T0 + pts.reduce((n, p) => n + p.dur, 0), end = pts[pts.length - 1];
  const hop = (i) => (s) => { const p = pts[i]; if (p) s.throwBall(p.x, p.y, p.h, p.dur, p.ap, i + 1 < pts.length ? hop(i + 1) : null, { kick: i === 0 }); };
  S.when(T0, hop(0));

  // Everyone goes for it: the kicking team can run the moment it's kicked (they just can't TOUCH it short of 10 yards).
  S.when(T0 + 0.05, () => all.forEach((a) => {
    if (a === winner) return;
    const mine = a.side === play.off, ang = (mine ? Math.PI : 0) + Math.sign(a.y - end.y || 1) * (0.3 + S.rand() * 1.1), r = 1.3 + S.rand() * 2.4;   // a ring around the ball, each team on its own side of it
    const near = dist(a.x, a.y, end.x, end.y) < 16, slot = [end.x + dir * Math.cos(ang) * r, clamp(end.y + Math.sin(ang) * r, -25, 25)];
    a.brain = near ? B.meet(slot[0], slot[1], tRec + 0.25 + S.rand() * 0.5, a.max * 0.95) : B.to(end.x + (a.side === play.off ? -dir : dir) * 6, clamp(a.y * 0.7, -24, 24), a.max * 0.6);
  }));
  if (winner) S.when(winner === K ? T0 + 0.15 : T0 + 0.05, () => { winner.brain = B.meet(end.x, end.y, tRec, winner.max * 1.35); });   // the kicker sprints after his own kick

  S.when(tRec, (s) => {
    if (!winner) { s.loose(dir * 0.5, 0, 0); return; }
    winner.x = end.x; winner.y = end.y;
    if (air) { winner.hop = { t0: s.t - 0.18, dur: 0.4, h: 0.45 }; s.give(winner); s.setPose(winner, 'catch', 0.3); }   // up and snags it on the hop
    else { s.give(winner); s.knock(winner, null, { dur: 0.22 }); }   // dives on it
    // The pile: whoever is right there dives in on top.
    all.forEach((a) => { if (a !== winner && !a.down && dist(a.x, a.y, end.x, end.y) < 2.6 && s.rand() < 0.55) s.when(s.t + 0.12 + s.rand() * 0.3, (ss) => { a.brain = null; ss.setPose(a, 'layout', 0.3); ss.when(ss.t + 0.25, (s3) => s3.knock(a, 1.6, { dur: 0.2 })); }); });
    const go = -dir, tackler = s.by[e.tackler];
    if (!e.got && !e.illegal && air) {   // the receiving team has it: down he goes, by his own choice or theirs
      const stop = [end.x + go * (e.adv || 0.5), end.y];
      winner.brain = B.to(stop[0], stop[1], 4);
      if (e.tackled && tackler) { tackler.down = false; tackler.brain = B.meet(stop[0], stop[1], s.t + 0.45, tackler.max * 1.3, (a, s3) => { s3.setPose(a, 'wrap', 0.3); s3.knock(winner, null, { dur: 0.3 }); s3.knock(a, 1.6, { dur: 0.32 }); }); }
      else s.when(s.t + 0.35, (s3) => { s3.setPose(winner, 'stumble', 0.2); s3.when(s3.t + 0.15, (s4) => s4.knock(winner, null, { back: true, dur: 0.24 })); });   // slides
    } else if (!e.got && !e.illegal && e.tackled && tackler) { tackler.down = false; tackler.brain = B.meet(end.x, end.y, s.t + 0.35, tackler.max * 1.3, (a, s3) => s3.knock(a, 1.6, { dur: 0.2 })); }   // lands on top of him
    else if (e.got) { if (air) s.when(s.t + 0.4, (s3) => s3.knock(winner, null, { dur: 0.25 })); s.when(s.t + 1.1, (s3) => cover.forEach((c) => { if (!c.down && dist(c.x, c.y, end.x, end.y) < 9) s3.setPose(c, 'cheer', 1.2); })); }
  });
  if (e.illegal) S.flag = { at: tRec + 0.12, x: end.x, y: end.y };   // he touched it short of 10: the nearest official throws his flag
  S.tEnd = tRec + (e.tackled ? 1.4 : 1.2);
}
