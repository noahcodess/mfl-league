// Broken tackles on the field: the runner's move and the defender's reaction. The defender closes, breaks down in a ready
// stance (sunk hips, arms out, choppy feet) a couple of yards in front of him, and then bites: the runner sells one way and
// goes the other, and the defender dives or lunges at the fake, overruns it, or loses his feet, and the runner is free. A spin
// bounces off him, a stiff arm shoves him to the ground, a truck flattens him. Runner moves: jab cut, double jab, stutter,
// cutback, spin, stiff arm, truck. Defender reactions: dive the wrong way, lunge and miss, overrun, broken ankles, bounced
// off, shoved down, run over. Both sides, at each runner's own speed, so the same broken tackle rarely looks the same twice.
import { B, stepTo, dist } from './sceneCore.js';

const RUNNER = { juke: ['jab', 'double', 'cutback'], shake: ['stutter', 'jab'], spin: ['spin'], 'stiff arm': ['stiff'], truck: ['truck'] };
const REACT = { jab: [['dive', 3], ['lunge', 3], ['overrun', 2], ['ankles', 1.5]], double: [['ankles', 2], ['dive', 2], ['overrun', 2]], cutback: [['overrun', 3], ['lunge', 2], ['dive', 1]],
  stutter: [['overrun', 3], ['lunge', 2], ['ankles', 1]], spin: [['bounce', 3], ['lunge', 1], ['dive', 1]], stiff: [['shoved', 1]], truck: [['flattened', 1]] };
const weighted = (S, list) => { let n = S.rand() * list.reduce((s, [, w]) => s + w, 0); for (const [k, w] of list) { if ((n -= w) < 0) return k; } return list[0][0]; };

// Extra seconds a move costs the runner (the stutter's hesitation), so the run's timing can allow for it.
export const moveCost = (e) => (e.move === 'shake' ? 0.22 : 0);

// c: the runner. d: the defender (or null). p: where he beats him. t: when. e: the engine's broken tackle. cut: which way the
// runner breaks (+1 or -1 across the field). run: +1 or -1, the way he's running along the field.
export function stageJuke(S, c, d, p, t, e, cut, run) {
  const move = (RUNNER[e.move] || RUNNER.juke)[Math.floor(S.rand() * (RUNNER[e.move] || RUNNER.juke).length)], react = weighted(S, REACT[move]);
  const fake = -cut || 1, quick = Math.max(0, Math.min(1, ((c.p?.r?.elusiveness ?? c.p?.r?.agility ?? 70) - 50) / 45));   // better movers sell it faster
  // the runner's move
  if (move === 'jab' || move === 'cutback') S.when(t - 0.36 + quick * 0.06, (s) => s.setPose(c, 'juke', 0.3 - quick * 0.08));
  if (move === 'double') { S.when(t - 0.5, (s) => s.setPose(c, 'juke', 0.18)); S.when(t - 0.26, (s) => s.setPose(c, 'juke', 0.2)); }
  if (move === 'stutter') { c.hesi = { from: t - 0.55, to: t - 0.25, k: 0.35 }; S.when(t - 0.55, (s) => s.setPose(c, 'stutter', 0.3)); }
  if (move === 'spin') S.when(t - 0.2, (s) => s.setPose(c, 'spin', 0.4));
  if (move === 'stiff') S.when(t - 0.28, (s) => s.setPose(c, 'stiff', 0.45));
  if (move === 'truck') S.when(t - 0.22, (s) => s.setPose(c, 'truck', 0.35));
  if (!d) return;
  // the defender closes and breaks down a couple of yards in front of him, squared up
  const ready = [p[0] + run * 1.8, p[1] + fake * 0.3], tReady = t - 0.5, tGo = Math.max(S.T0, t - 1.7);
  S.when(tGo, (s) => {
    d.pose = null; d.blockedUntil = 0;
    const far = dist(d.x, d.y, ready[0], ready[1]), can = d.max * Math.max(0.2, tReady - s.t);
    const spot = far <= can ? ready : [d.x + (ready[0] - d.x) * (can / far), d.y + (ready[1] - d.y) * (can / far)];   // too far to get set: meet him on the way
    d.brain = B.meet(spot[0], spot[1], tReady, d.max, (a) => { a.face = -run; a.homeFace = -run; });
  });
  S.when(tReady, (s) => { s.setPose(d, 'breakdown', 0.5); d.face = -run; d.homeFace = -run; d.brain = (a, dt) => stepTo(a, c.x + run * 1.6, c.y + fake * 0.25, 2.2, dt); });   // choppy feet, mirroring him
  // ...and bites
  const bite = move === 'stutter' ? t - 0.32 : move === 'double' ? t - 0.24 : t - 0.16;
  S.when(bite, (s) => {
    const fx = c.x + run * 0.9, fy = c.y + fake * 2;   // where the fake said he was going
    if (react === 'dive') { s.setPose(d, 'layout', 0.6); d.brain = (a, dt) => stepTo(a, fx, fy, a.max * 1.2, dt); s.when(s.t + 0.42, () => s.knock(d, 1.3)); }
    else if (react === 'lunge') { s.setPose(d, 'tackle', 0.35); d.brain = (a, dt) => stepTo(a, fx, fy - fake * 0.6, a.max, dt); s.when(s.t + 0.38, (ss) => { ss.setPose(d, 'stumble', 0.5); ss.when(ss.t + 0.3, () => ss.knock(d, 1.2)); }); }
    else if (react === 'overrun') { d.pose = null; d.brain = (a, dt) => stepTo(a, fx - run * 1.5, fy + fake * 1.5, a.max, dt); s.when(s.t + 0.55, (ss) => { ss.setPose(d, 'plant', 0.3); d.brain = B.pursue(c, d.max * 0.95, 0.8); }); }
    else if (react === 'ankles') { s.setPose(d, 'stumble', 0.4); d.brain = (a, dt) => stepTo(a, fx, fy, 3, dt); s.when(s.t + 0.32, () => s.knock(d, 1.5)); }
    else if (react === 'bounce') { s.setPose(d, 'wrap', 0.3); d.brain = (a, dt) => stepTo(a, c.x, c.y, a.max, dt); s.when(t + 0.12, (ss) => { ss.setPose(d, 'stumble', 0.3); ss.when(ss.t + 0.2, () => ss.knock(d, 1.3)); }); }
    else if (react === 'shoved') { s.when(t - 0.06, (ss) => { ss.setPose(d, 'driven', 0.4); d.brain = (a, dt) => stepTo(a, a.x + run * 1.2, a.y - cut * 1.6, 5, dt); ss.when(ss.t + 0.32, () => ss.knock(d, 1.3)); }); }
    else if (react === 'flattened') { s.when(t - 0.04, (ss) => { ss.setPose(d, 'driven', 0.3); d.brain = (a, dt) => stepTo(a, a.x + run * 2, a.y, 7, dt); ss.when(ss.t + 0.2, () => ss.knock(d, 1.6)); }); }
  });
}
