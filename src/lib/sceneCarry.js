// A ball carrier's run once he has it (a handoff, a catch, a return): through each broken tackle, with his move (a juke,
// a spin, a stiff arm, running a man over) while the defender whiffs or gets flattened, to the spot the engine says. If
// the play goes out of bounds he runs upfield first, then angles to the sideline. Then the tackle (finishCarry).
import { B, clamp, dist } from './sceneCore.js';
import { finishCarry, ev } from './sceneLineup.js';

const MOVE = { juke: 'juke', shake: 'juke', spin: 'spin', 'stiff arm': 'stiff', truck: 'stiff' };

// The carrier's run after he has the ball: through each broken tackle to the end spot. Returns tEnd.
export function carryPath(S, c, from, t0, endAlong, endLat, play) {
  const broken = ev(play, 'tackle').filter((e) => e.result === 'broken'), made = ev(play, 'tackle').find((e) => e.result === 'made');
  const end = S.at(play.result.td ? endAlong + 2 : endAlong, play.result.oob ? (endLat >= 0 ? 26.9 : -26.9) : endLat);
  const pts = [from], marks = [];
  if (play.result.oob) { const al0 = S.along({ x: from[0] }); pts.push(S.at(al0 + (endAlong - al0) * 0.6, from[1] + (end[1] - from[1]) * 0.55)); }   // upfield first, then angle out
  broken.forEach((e, i) => { const al = clamp(e.at, S.along({ x: from[0] }) + 1, endAlong - 0.5), k = (al - S.along({ x: from[0] })) / Math.max(1, endAlong - S.along({ x: from[0] })); const p = S.at(al, from[1] + (end[1] - from[1]) * k + (i % 2 ? 1.6 : -1.6)); pts.push(p); marks.push({ e, p }); });
  pts.push(end);
  let L = 0; const at = [0]; for (let i = 1; i < pts.length; i++) { L += dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); at.push(L); }
  const v = c.max * (L > 20 ? 0.97 : 0.9), tEnd = t0 + 0.1 + L / v;
  S.when(t0, () => { c.brain = B.carry(pts.slice(1), t0, tEnd, c.max); });
  marks.forEach(({ e, p }, i) => { // each whiff
    const t = t0 + 0.1 + at[i + 1] / v, d = S.by[e.def];
    S.when(t - 0.3, (s) => s.setPose(c, MOVE[e.move] || 'juke', e.move === 'spin' ? 0.4 : 0.45));
    if (d) S.when(Math.max(S.T0, t - 1.4), (s) => { d.pose = null; d.brain = B.meet(p[0] + S.dir * 0.6, p[1] + (i % 2 ? -0.9 : 0.9), t, d.max * 1.05, (a, ss) => { ss.setPose(a, e.move === 'truck' || e.move === 'stiff arm' ? 'driven' : ss.rand() < 0.5 ? 'layout' : 'tackle', 0.35); ss.when(ss.t + 0.25, () => ss.knock(a, 1.3)); }); });   // he whiffs (or gets run over) and goes down
  });
  finishCarry(S, c, end, tEnd, { tk: made && S.by[made.def], td: play.result.td, oob: play.result.oob, fumble: ev(play, 'fumble')[0] });
  return tEnd;
}
