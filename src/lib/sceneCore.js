// The live play simulation behind the pixel broadcast (built the Sim Test 1 way): every player has a "brain" that steers him
// each frame (run this route, shadow that receiver, block that rusher, chase the ball carrier) and he can never move faster
// than his own top speed, so nobody teleports. The engine has already decided what happens; the brains just get everyone
// there. The ball flies in an arc, sits in a carrier's hands, or bounces and rolls when it's loose.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const rating = (p, k) => p?.r?.[k] ?? 60;
// Top speed in yards per second from his Speed rating (a 99 runs about 11.6, a 50 lineman about 8). getGoing: seconds to start.
export const yps = (p) => 4.3 + 0.074 * clamp(rating(p, 'speed'), 30, 99);
export const getGoing = (p) => 0.34 - 0.003 * clamp(rating(p, 'acceleration'), 30, 99);
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Moves a toward (tx, ty) at no more than `speed` yards per second. Returns how far is left.
export function stepTo(a, tx, ty, speed, dt) {
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  if (d < 1e-4) return 0;
  const s = Math.min(d, speed * dt); a.x += (dx / d) * s; a.y += (dy / d) * s;
  return d - s;
}

// How well he changes direction, 0 to 1. There's no Change of Direction rating, so it's his Agility (WR, CB, linemen) or
// Elusiveness (RB), and for everyone else his Speed.
const cutSkill = (p) => clamp(((p?.r?.agility ?? p?.r?.elusiveness ?? rating(p, 'speed')) - 40) / 59, 0, 1);
// A ball carrier's step with momentum: he can only turn so fast, and a cut costs him speed (a sharp one more than a slight
// one). The best cutters keep most of it, but everybody slows down some. Then he speeds back up at his Acceleration.
export function runStep(a, tx, ty, want, dt) {
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  if (d < 1e-4) return 0;
  const ux = dx / d, uy = dy / d, cut = cutSkill(a.p);
  if (!a.hd) { const v = Math.hypot(a.vx || 0, a.vy || 0); a.hd = v > 0.5 ? [a.vx / v, a.vy / v] : [ux, uy]; a.sp = Math.min(v, a.max); }
  const ang = Math.acos(clamp(a.hd[0] * ux + a.hd[1] * uy, -1, 1)), turn = (4.2 + 6.5 * cut) * dt;
  if (ang <= turn || d < 0.6) a.hd = [ux, uy];
  else { const sg = a.hd[0] * uy - a.hd[1] * ux >= 0 ? 1 : -1, c = Math.cos(turn * sg), sn = Math.sin(turn * sg); a.hd = [a.hd[0] * c - a.hd[1] * sn, a.hd[0] * sn + a.hd[1] * c]; }
  const cap = want * (1 - (0.55 - 0.4 * cut) * Math.min(1, ang / 1.57));   // a 90-degree cut: the best keep 85%, the worst 45%
  const acc = 5 + 5 * clamp((rating(a.p, 'acceleration') - 40) / 59, 0, 1);
  a.sp = a.sp > cap ? Math.max(cap, a.sp - 16 * dt) : Math.min(cap, a.sp + acc * dt);
  const st = Math.min(d, Math.max(0.3, a.sp) * dt); a.x += a.hd[0] * st; a.y += a.hd[1] * st;
  return Math.hypot(tx - a.x, ty - a.y);
}

// Brains: functions (a, dt, S) run every frame.
export const B = {
  idle: () => () => {},
  to: (x, y, speed, then) => { let done = false; return (a, dt, S) => { if (stepTo(a, x, y, speed, dt) <= 0.02 && !done) { done = true; then?.(a, S); } }; },
  // Along a list of points, aiming to finish at t1 but never faster than max (if he can't make it, he's late, not a blur).
  path: (pts, t0, t1, max, then) => {
    let i = 0, done = false;
    return (a, dt, S) => {
      if (S.t < t0 || done) return;
      let left = 0; for (let k = i; k < pts.length; k++) left += dist(k === i ? a.x : pts[k - 1][0], k === i ? a.y : pts[k - 1][1], pts[k][0], pts[k][1]);
      const speed = Math.min(max, left / Math.max(0.05, t1 - S.t));
      if (stepTo(a, pts[i][0], pts[i][1], Math.max(speed, 0.5), dt) <= 0.03) { if (i < pts.length - 1) i++; else { done = true; then?.(a, S); } }
    };
  },
  // A ball carrier on his way to the engine's spot by t1: follows the path, but cuts around a defender squared up in front
  // of him (away from the sideline unless he's headed out of bounds). A defender off to the side or behind him is ignored:
  // with the angle and the speed he just runs by. The tackler waiting at the end of the run isn't dodged.
  carry: (pts, t0, t1, max) => {
    let i = 0, done = false, fresh = true;
    return (a, dt, S) => {
      if (S.t < t0 || done) return;
      if (fresh) { a.hd = null; fresh = false; }   // momentum starts from how he's moving right now
      if (Math.abs(pts[pts.length - 1][1]) >= 26) a.oobOK = true;   // this run is meant to end out of bounds
      let left = 0; for (let k = i; k < pts.length; k++) left += dist(k === i ? a.x : pts[k - 1][0], k === i ? a.y : pts[k - 1][1], pts[k][0], pts[k][1]);
      const speed = Math.min(max, (left + 0.6) / Math.max(0.05, t1 - S.t));
      let [tx, ty] = pts[i];
      const dx = tx - a.x, dy = ty - a.y, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
      if (S.t < t1 - 0.6) {
        for (const d of S.actors) {
          if (d.side === a.side || d.down || d === S.tackler) continue;
          const rx = d.x - a.x, ry = d.y - a.y, ahead = rx * ux + ry * uy, side = rx * -uy + ry * ux;
          if (ahead > 0.2 && ahead < 3.5 && Math.abs(side) < 1.7) {   // squared up in front: cut around him
            const away = side > 0 ? -1 : 1, edge = !a.oobOK && Math.abs(a.y + away * 2) > 19 && Math.sign(away) === Math.sign(a.y) ? -away : away, clear = 1.9 - Math.abs(side) * 0.5;   // near the sideline he cuts inside
            tx = a.x + ux * 2.4 + -uy * edge * clear; ty = a.y + uy * 2.4 + ux * edge * clear;   // a hard cut around him, then back on line
            break;
          }
        }
      }
      if (Math.abs(pts[pts.length - 1][1]) < 26) ty = clamp(ty, -24.8, 24.8);   // stays in bounds unless the play goes out
      if (runStep(a, tx, ty, Math.max(speed, 0.5), dt) <= 0.03 || dist(a.x, a.y, pts[i][0], pts[i][1]) < 0.35) { if (i < pts.length - 1) i++; else done = true; }
    };
  },
  pursue: (target, speed, stop = 1) => (a, dt) => { if (dist(a.x, a.y, target.x, target.y) > stop) stepTo(a, target.x + (target.vx || 0) * 0.25, target.y + (target.vy || 0) * 0.25, speed, dt); },
  // Get to (px, py) at tArrive, no faster than max; if he's late he keeps going until he gets there.
  meet: (px, py, tArrive, max, then) => {
    let done = false;
    return (a, dt, S) => {
      if (done) return;
      const d = dist(a.x, a.y, px, py), rem = tArrive - S.t, speed = rem > 0.02 ? Math.min(max, d / rem) : max;
      if (stepTo(a, px, py, speed, dt) <= 0.05) { done = true; then?.(a, S); }
    };
  },
  shadow: (rcv, trail, side, max) => (a, dt) => stepTo(a, rcv.x - trail, rcv.y + side, max, dt),
  gather: (S, px, py, r = 2) => { const ang = S.rand() * 6.28, rr = r * (0.7 + S.rand() * 0.6), tx = px + Math.cos(ang) * rr, ty = clamp(py + Math.sin(ang) * rr * 0.7, -26, 26); return (a, dt) => stepTo(a, tx, ty, 3.2, dt); },
};

export class Scene {
  constructor(play, seed) {
    Object.assign(this, { play, actors: [], by: {}, t: 0, timers: [], rand: rng(seed), T0: 2.8, tEnd: 4, dur: 6, flag: null, tee: null, lines: null });
    this.ball = { x: 50, y: 0, h: 0.1, holder: null, flight: null, loose: null, wobble: false, spin: false };
  }
  // side: 'home' | 'away'. face: 1 right, -1 left. idle: his stance before the snap.
  add(p, side, x, y, face, idle = 'stand') {
    if (!p) return null;
    const a = { id: p.id, p, side, x, y, vx: 0, vy: 0, face, homeFace: face, brain: null, down: false, pose: null, poseAt: 0, idle, max: yps(p) };
    this.actors.push(a); this.by[p.id] = a; return a;
  }
  when(t, fn) { this.timers.push({ t, fn, fired: false }); }   // do fn at time t
  setPose(a, name, hold) { if (!a) return; a.pose = name; a.poseAt = this.t; if (hold) this.when(this.t + hold, () => { if (a.pose === name) a.pose = null; }); }
  knock(a, upAfter = null) { if (!a) return; a.down = true; a.pose = null; a.downAt = this.t; if (upAfter) this.when(this.t + upAfter, () => { a.down = false; a.brain = B.idle(); }); }
  update(dt) {
    this.t += dt;
    for (const tm of this.timers) if (!tm.fired && this.t >= tm.t) { tm.fired = true; tm.fn(this); }
    for (const a of this.actors) {
      const ox = a.x, oy = a.y;
      if (a.pre && this.t < this.T0) { if (this.t > (a.pre.at ?? 0.4)) stepTo(a, a.pre.x, a.pre.y, a.pre.speed, dt); }   // in the huddle, then jogging to his spot
      else if (a.blockedUntil > this.t && !a.down) { this.setPose(a, 'block'); }   // engaged with a blocker: he's going nowhere for now
      else if (a.brain && !a.down) a.brain(a, dt, this);
      const edge = a.oobOK || this.t > (this.tEnd ?? 99) ? 29 : 26.4; a.y = clamp(a.y, -edge, edge);   // nobody leaves the field mid-play unless the play goes out
      a.vx = (a.x - ox) / dt; a.vy = (a.y - oy) / dt;
    }
    const b = this.ball;
    if (b.flight) {
      const f = b.flight, u = clamp((this.t - f.t0) / (f.t1 - f.t0), 0, 1);
      b.x = lerp(f.x0, f.x1, u); b.y = lerp(f.y0, f.y1, u); b.h = lerp(f.h0, f.h1, u) + f.apex * 4 * u * (1 - u);
      if (u >= 1) { b.flight = null; b.spin = false; f.land?.(this); }
    } else if (b.holder) { b.x = b.holder.x; b.y = b.holder.y; b.h = b.holder.down ? 0.25 : 0.62; }
    else if (b.loose) { // bounces, then rolls to a stop
      const L = b.loose; L.vh -= 26 * dt; b.x += L.vx * dt; b.y += L.vy * dt; b.h += L.vh * dt;
      if (b.h <= 0.12) { b.h = 0.12; if (Math.abs(L.vh) > 1.5) { L.vh = -L.vh * 0.45; L.vx *= 0.65; L.vy *= 0.65; L.wild = !L.wild; } else { L.vh = 0; L.vx *= 1 - dt * 3; L.vy *= 1 - dt * 3; } }
    }
  }
  // The ball in the air from where it is now to (x1, y1) at height h1, taking `dur` seconds and peaking `apex` yards higher.
  throwBall(x1, y1, h1, dur, apex, land, opts = {}) {
    const b = this.ball; b.holder = null; b.loose = null; b.spin = true; b.wobble = !!opts.wobble; b.kick = !!opts.kick;
    b.flight = { x0: b.x, y0: b.y, h0: b.h, x1, y1, h1, t0: this.t, t1: this.t + dur, apex, land };
  }
  give(a) { const b = this.ball; b.holder = a; b.flight = null; b.loose = null; b.spin = false; b.wobble = false; }
  loose(vx, vy, vh) { const b = this.ball; b.holder = null; b.flight = null; b.spin = false; b.loose = { vx, vy, vh }; }
}
