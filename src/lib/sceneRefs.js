// The officials on the field: the NFL's seven-man crew (referee, umpire, down judge, line judge, side judge, field judge,
// back judge), each in his spot before the snap. Once the ball is snapped they move with the play (a little slower than the
// players, in three different running styles, the deep men backpedaling to keep it in front of them), and they make the
// calls: the nearest one throws the flag at the foul (it floats down over about a second and a half) and keeps his arm up,
// the closest one signals a touchdown, waves off an incompletion or points for a first down. Drawn by refSprite.js and
// flagDraw.js. Never touches the result of a play.
import { clamp, dist, stepTo } from './sceneCore.js';
import { refLook } from './refSprite.js';

// [code, yards behind (-) or past (+) the line, lateral yards, cap]: the referee wears the white cap.
const CREW = [['R', -12, 4, 'white'], ['U', -7, -3, 'black'], ['DJ', 0, -28, 'black'], ['LJ', 0, 28, 'black'], ['SJ', 17, -27.5, 'black'], ['FJ', 19, 27.5, 'black'], ['BJ', 24, 2, 'black']];
const ev = (play, type) => (play.events || []).filter((e) => e.type === type);

// Sets up the crew and the flag for this scene (call after the play is built). seed: the game's, so they look the same all game.
export function addRefs(S, seed = 1) {
  const d = S.dir || 1;
  S.refs = CREW.map(([code, along, lat, cap], k) => ({ code, cap, look: refLook(code, cap, seed), x: S.los + d * along, y: lat, x0: S.los + d * along, y0: lat, face: along > 0 ? -d : d, vx: 0, gait: k % 3, run: 0, sig: null, sigAt: 0, sp: 0 }));
  S.tick = stepRefs;
  const f = ev(S.play, 'flag')[0];
  if (f) {   // when the flag comes out: before the snap at the snap, holding mid-play, interference as the ball arrives
    const pre = S.play.kind === 'penalty', pi = /pass interference/i.test(f.name);
    const t = pre ? (S.flag?.t ?? S.T0 - 0.2) : pi ? (S.tCatch ?? S.tEnd - 0.5) + 0.15 : S.T0 + 1.3 + (S.play.n % 5) * 0.08;
    const rel = t + 0.22, air = 1.35 + (S.play.n % 7) * 0.04;   // the windup, then about a second and a half in the air
    S.flag = { t, rel, land: rel + air, x: S.flag?.x ?? S.los, y: S.flag?.y ?? 0, by: null, name: f.name };
    S.when(t, (s) => {   // the foul spot is wherever the offender is right now; the nearest official throws it
      const who = s.by[f.on]; if (who) { s.flag.x = who.x; s.flag.y = who.y; }
      const ref = s.refs.slice().sort((a, b) => dist(a.x, a.y, s.flag.x, s.flag.y) - dist(b.x, b.y, s.flag.x, s.flag.y))[0];
      s.flag.by = ref.code; ref.throwFace = Math.sign(s.flag.x - ref.x) || ref.face; signal(ref, 'throw', s.t);
      s.when(s.flag.rel, () => { s.flag.x0 = ref.x + ref.throwFace * 0.4; s.flag.y0 = ref.y; ref.thrown = true; });
      s.when(s.t + 0.5, () => signal(ref, 'flagArm', s.t));
    });
  }
  const r = S.play.result || {};
  const near = (s, list) => s.refs.filter((x) => list.includes(x.code)).sort((a, b) => dist(a.x, a.y, s.ball.x, s.ball.y) - dist(b.x, b.y, s.ball.x, s.ball.y))[0];
  if (r.td) S.when(S.tEnd + 0.15, (s) => signal(near(s, ['DJ', 'LJ', 'BJ', 'FJ', 'SJ']), 'td', s.t));
  else if (r.incomplete && S.tCatch) S.when(S.tCatch + 0.35, (s) => signal(near(s, ['BJ', 'FJ', 'SJ', 'DJ', 'LJ', 'U']), 'incomplete', s.t));
  else if (r.firstDown && !f) S.when(S.tEnd + 0.45, (s) => signal(near(s, ['DJ', 'LJ']), 'first', s.t, d));
}

// dir: which way he points (a first down points the way the offense is going).
export function signal(ref, sig, t, dir) { if (ref) { ref.sig = sig; ref.sigAt = t; if (dir) ref.dir = dir; } }

// Every frame: where each official is heading, and how fast (a referee jogs, he doesn't sprint with the receivers).
function stepRefs(S, dt) {
  const b = S.ball, d = S.dir || 1, t = S.t, live = t >= S.T0, over = t > S.tEnd + 0.3;
  for (const r of S.refs) {
    let tx = r.x0, ty = r.y0, speed = 5 + r.gait * 0.45;
    if (live && !over) {
      const ahead = (b.x - S.los) * d;   // how far the ball has gone
      if (r.code === 'R') { tx = b.x - d * 9; ty = clamp(b.y * 0.4 + 4, -20, 20); }
      else if (r.code === 'U') { tx = b.x - d * 5; ty = clamp(b.y * 0.5 - 3, -20, 20); }
      else if (r.code === 'DJ' || r.code === 'LJ') tx = b.x;                       // the wing officials run the sideline with the ball
      else if (r.code === 'BJ') { tx = r.x0 + d * Math.max(0, ahead - 12); ty = clamp(b.y * 0.6, -18, 18); }
      else tx = r.x0 + d * Math.max(0, ahead - 10);                                // side and field judges keep the play in front of them
    } else if (over) { tx = r.code === 'R' || r.code === 'U' ? b.x - d * (r.code === 'R' ? 3 : 1.5) : r.code === 'DJ' || r.code === 'LJ' ? b.x : r.x; ty = r.code === 'R' ? b.y + 2 : r.code === 'U' ? b.y - 1.5 : r.y; speed = 3; }
    const busy = r.sig && r.sig !== 'flagArm' && t - r.sigAt < 2.4;
    if (r.sig === 'throw') speed *= 0.25; else if (busy) speed = 0.2;              // he pulls up to make the call
    const ox = r.x, oy = r.y; stepTo(r, tx, ty, speed, dt);
    r.vx = (r.x - ox) / dt; r.sp = Math.hypot(r.x - ox, r.y - oy) / dt; r.run += r.sp * dt;   // r.run: distance covered (drives the leg cycle)
    const toBall = Math.sign(b.x - r.x) || r.face;
    if (['BJ', 'FJ', 'SJ', 'R', 'U'].includes(r.code) && Math.abs(r.vx) > 0.4 && Math.sign(r.vx) !== toBall && r.sp < 6.5) { r.back = true; r.face = toBall; }   // backing up, eyes on the ball
    else { r.back = false; if (Math.abs(r.vx) > 0.4) r.face = Math.sign(r.vx); else if (!r.sp) r.face = toBall; }
    if (r.sig && r.sig !== 'flagArm' && t - r.sigAt > 2.6) r.sig = null;            // signals don't last forever (the flag arm stays up)
  }
}

// Where the flag is: floating from the official's hand to the spot. It goes up quickly, the cloth's drag slows it down,
// and it drifts down the rest of the way, then lies there.
export function flagAt(S) {
  const f = S.flag; if (!f || f.by == null || f.x0 == null || S.t < f.rel) return null;
  const u = clamp((S.t - f.rel) / (f.land - f.rel), 0, 1), age = S.t - f.rel;
  if (u >= 1) return { x: f.x, y: f.y, h: 0, landed: true, age };
  const K = 2.4, g = (q) => (1 - Math.exp(-K * q)) / (1 - Math.exp(-K)), hAt = (q) => 2.5 * (1 - q) + 1.7 * Math.sin(Math.PI * q ** 0.7);
  const k = g(u), drift = Math.sin(age * 6.5) * 0.18 * u, du = 0.02;
  const vx = ((f.x - f.x0) * (g(Math.min(1, u + du)) - k)) / du, vh = (hAt(Math.min(1, u + du)) - hAt(u)) / du;
  return { x: f.x0 + (f.x - f.x0) * k + drift, y: f.y0 + (f.y - f.y0) * k, h: Math.max(0, hAt(u)), landed: false, vx, vh, age };
}
