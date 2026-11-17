// Route running and pass coverage on the field. Receivers run with momentum: at the break they plant and lose some speed,
// and the better route runner (Route Running) keeps more of it and turns sharper. Defenders play it the way the call says:
// man (pressed at the line or off with a cushion, shading inside or outside) or zone (dropping to a spot and picking up
// whoever comes into it). At the break the defender is a beat late (how late: his coverage rating against the receiver's
// route running), then he trails on the side the receiver broke away from. How far off he ends up is the separation the
// engine gave that receiver, so how open a man looks is how open he was.
import { clamp, dist, stepTo, runStep } from './sceneCore.js';

const r0 = (p, k, d = 60) => p?.r?.[k] ?? d;
const skill = (v) => clamp((v - 40) / 59, 0, 1);
export const routeSkill = (p) => skill(r0(p, 'route_running', r0(p, 'agility', r0(p, 'speed', 60))));

// The seconds a route really takes with plants at the breaks (stepped with the same physics the receiver runs on).
export function routeTime(from, pts, max, p) {
  const a = { x: from[0], y: from[1], vx: 0, vy: 0, max, p, hd: null, sp: max * 0.25 }, sk = routeSkill(p);
  let t = 0, i = 0;
  while (i < pts.length && t < 20) { t += 1 / 30; if (runStep(a, pts[i][0], pts[i][1], max, 1 / 30, sk) < 0.35) i++; }
  return t;
}

// A receiver's route: along the points with momentum, aiming to finish at t1 but never faster than his own speed.
export function routeBrain(pts, t0, t1, max) {
  let i = 0, done = false, fresh = true;
  return (a, dt, S) => {
    if (S.t < t0 || done) return;
    if (fresh) { a.hd = null; fresh = false; }
    a.now = S.t;
    let left = 0; for (let k = i; k < pts.length; k++) left += dist(k === i ? a.x : pts[k - 1][0], k === i ? a.y : pts[k - 1][1], pts[k][0], pts[k][1]);
    const want = Math.min(max, Math.max(0.5, left / Math.max(0.05, t1 - S.t)));
    if (runStep(a, pts[i][0], pts[i][1], want, dt, routeSkill(a.p)) < 0.35) { if (i < pts.length - 1) i++; else done = true; }
  };
}

// The route's break: when he makes his last cut and which way it takes him across the field (+1 or -1, 0 for straight).
export function breakOf(from, pts, tStart, tEnd) {
  if (pts.length < 2) return { at: null, side: 0 };
  let L = dist(from[0], from[1], pts[0][0], pts[0][1]); const seg = [L];
  for (let k = 1; k < pts.length; k++) { L += dist(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]); seg.push(L); }
  const c = pts.length - 2, dy = pts[c + 1][1] - pts[c][1], dx = pts[c + 1][0] - pts[c][0];
  return { at: tStart + (tEnd - tStart) * (seg[c] / Math.max(1, L)), side: Math.abs(dy) > Math.abs(dx) * 0.35 ? Math.sign(dy) : 0 };
}

// Zone landmarks by coverage: [yards downfield, yards across, toward the receiver's side] for corners, the safety and the backer.
const ZONES = {
  two: { CB1: [5, 19], CB2: [5, 19], SS: [16, 11], LB1: [6, 5] },
  three: { CB1: [13, 17], CB2: [13, 17], SS: [8, 9], LB1: [6, 3] },
  prevent: { CB1: [20, 16], CB2: [20, 16], SS: [26, 4], LB1: [11, 6] },
};
const zoneSet = (name = '') => (/prevent/i.test(name) ? ZONES.prevent : /cover 2|tampa/i.test(name) ? ZONES.two : ZONES.three);

// Does this corner press at the line? Man coverage and a good Press rating, most of the time.
export function presses(S, cb) {
  if (S.play.defCall?.cov !== 'man' || !cb) return false;
  let h = 11; for (const ch of String(cb.id) + S.play.n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 100) / 100 < clamp((r0(cb, 'press', 55) - 55) / 30, 0.1, 0.85);
}

// cv: the defender. r: his receiver. o: { sep (yards at the top of the route), last (separation when the ball gets there,
// for the target), brk (breakOf), mine (he's the target), tThrow, tCatch, at (where the ball goes), key (CB1, SS...),
// press }. Returns his brain.
export function coverBrain(S, cv, r, o) {
  const dir = S.dir, man = S.play.defCall?.cov !== 'zone', T0 = S.T0;
  const cov = r0(cv.p, man ? 'man_cover' : 'zone_cover', 55), rr = r0(r.p, 'route_running', r0(r.p, 'speed', 60));
  const react = clamp(0.3 - (cov - rr) / 220, 0.1, 0.48);           // how long he's a beat late at the break
  const outSide = Math.sign(r.y || 1), sep = clamp(o.sep, 0.3, 6);
  // which shoulder he plays: covered tight, he's sitting on the break side; beaten, the receiver breaks away from him
  const lev = o.brk.side ? (sep < 1.3 ? o.brk.side : -o.brk.side) : (S.rand() < 0.5 ? outSide : -outSide);
  const zone = !man && zoneSet(S.play.defCall?.coverage)[o.key];
  // his landmark; for the target's defender it's the area the ball goes to (it's his zone the receiver settles in, at the
  // separation the engine gave him)
  const spot = zone && (o.mine && o.at ? [o.at[0] + dir * clamp(o.last, 0.5, 6) * 0.8, o.at[1] - outSide * clamp(o.last, 0.5, 6) * 0.5] : S.at(zone[0], clamp(outSide * zone[1], -24, 24)));
  const brkAt = o.brk.at ?? T0 + 1.2, reactAt = brkAt + react;
  let cushion = o.press ? 1.2 : 5;
  const brain = (a, dt, s) => {
    if (s.t < T0 + 0.08) return;
    const sp = a.max;
    if (o.mine && s.t > Math.min(o.tCatch - 0.4, o.tThrow + 0.15) && o.at) {   // the ball's in the air: he breaks on it, as close as the engine says he got
      const u = r.hd || [dir, 0], fin = clamp(o.last, 0.5, 6), tx = o.at[0] - u[0] * fin * 0.72, ty = o.at[1] - u[1] * fin * 0.72 + lev * fin * 0.42;
      stepTo(a, tx, ty, Math.min(sp, dist(a.x, a.y, tx, ty) / Math.max(0.05, o.tCatch - s.t) + 0.4), dt);
      return;
    }
    if (zone && !(o.mine && s.t > o.tThrow)) {   // zone: get to his spot, then carry anyone who comes through it
      const near = dist(r.x, r.y, spot[0], spot[1]) < 6;
      if (!near) { stepTo(a, spot[0], spot[1], sp * (s.t < T0 + 0.6 ? 0.6 : 0.85), dt); return; }
    }
    if (s.t < reactAt) {   // before the break (and the beat after it): mirror him with a cushion, eat the cushion as he comes
      cushion = o.press ? Math.max(0.9, cushion - dt * 0.15) : Math.max(1.4, cushion - dt * 2.2);
      const tx = r.x + dir * cushion, ty = r.y - outSide * 0.2 + lev * 0.7;
      stepTo(a, tx, ty, cushion > 2 && s.t < T0 + 1 ? sp * 0.72 : sp, dt);   // backpedal, then turn and run
      return;
    }
    const u = r.hd || [dir, 0], gap = o.mine ? clamp(o.last, 0.5, 6) : sep * 0.85;   // after the break: trailing, on the side he broke away from
    stepTo(a, r.x - u[0] * gap * 0.75, r.y - u[1] * gap * 0.75 + lev * gap * 0.45, sp, dt);
  };
  brain.cover = true;
  return brain;
}
