// The officials on the field: the NFL's seven-man crew (referee, umpire, down judge, line judge, side judge, field judge,
// back judge), each in his spot before the snap. Once the ball is snapped they move with the play (a little slower than the
// players, a few different gaits), and they make the calls: the nearest one throws the flag right where the foul happened
// and holds his arm up, the closest one signals a touchdown, waves off an incompletion or points for a first down, and in
// the close-up after a flag (PixelGame) he acts out the penalty. Drawn by refDraw.js. Never touches the result of a play.
import { clamp, dist, stepTo } from './sceneCore.js';

// [code, yards behind (-) or past (+) the line, lateral yards, cap]: the referee wears the white cap.
const CREW = [['R', -12, 4, 'white'], ['U', -7, -3, 'black'], ['DJ', 0, -28, 'black'], ['LJ', 0, 28, 'black'], ['SJ', 17, -27.5, 'black'], ['FJ', 19, 27.5, 'black'], ['BJ', 24, 2, 'black']];
const ev = (play, type) => (play.events || []).filter((e) => e.type === type);

// Sets up the crew and the flag for this scene (call after the play is built).
export function addRefs(S) {
  const d = S.dir || 1;
  S.refs = CREW.map(([code, along, lat, cap], k) => ({ code, cap, x: S.los + d * along, y: lat, x0: S.los + d * along, y0: lat, face: -d, vx: 0, gait: k % 3, run: 0, sig: null, sigAt: 0 }));
  S.tick = stepRefs;
  const f = ev(S.play, 'flag')[0];
  if (f) {   // when the flag comes out: before the snap at the snap, holding mid-play, interference as the ball arrives
    const pre = S.play.kind === 'penalty', pi = /pass interference/i.test(f.name);
    const t = pre ? (S.flag?.t ?? S.T0 - 0.2) : pi ? (S.tCatch ?? S.tEnd - 0.5) + 0.15 : S.T0 + 1.3 + (S.play.n % 5) * 0.08;
    S.flag = { t, land: t + 0.55, x: S.flag?.x ?? S.los, y: S.flag?.y ?? 0, by: null, name: f.name };
    S.when(t, (s) => {   // the foul spot is wherever the offender is right now; the nearest official throws it
      const who = s.by[f.on]; if (who) { s.flag.x = who.x; s.flag.y = who.y; }
      const ref = s.refs.slice().sort((a, b) => dist(a.x, a.y, s.flag.x, s.flag.y) - dist(b.x, b.y, s.flag.x, s.flag.y))[0];
      s.flag.by = ref.code; s.flag.x0 = ref.x; s.flag.y0 = ref.y; signal(ref, 'throw', s.t); s.when(s.t + 0.4, () => signal(ref, 'flagArm', s.t));
    });
  }
  const r = S.play.result || {};
  const near = (s, list) => s.refs.filter((x) => list.includes(x.code)).sort((a, b) => dist(a.x, a.y, s.ball.x, s.ball.y) - dist(b.x, b.y, s.ball.x, s.ball.y))[0];
  if (r.td) S.when(S.tEnd + 0.15, (s) => signal(near(s, ['DJ', 'LJ', 'BJ', 'FJ', 'SJ']), 'td', s.t));
  else if (r.incomplete && S.tCatch) S.when(S.tCatch + 0.35, (s) => signal(near(s, ['BJ', 'FJ', 'SJ', 'DJ', 'LJ', 'U']), 'incomplete', s.t));
  else if (r.firstDown && !f) S.when(S.tEnd + 0.45, (s) => signal(near(s, ['DJ', 'LJ']), 'first', s.t));
}

export function signal(ref, sig, t) { if (ref) { ref.sig = sig; ref.sigAt = t; } }

// Every frame: where each official is heading, and how fast (a referee jogs, he doesn't sprint with the receivers).
function stepRefs(S, dt) {
  const b = S.ball, d = S.dir || 1, t = S.t, live = t >= S.T0, over = t > S.tEnd + 0.3;
  for (const r of S.refs) {
    let tx = r.x0, ty = r.y0, speed = 5.2 + r.gait * 0.4;
    if (live && !over) {
      const ahead = (b.x - S.los) * d;   // how far the ball has gone
      if (r.code === 'R') { tx = b.x - d * 9; ty = clamp(b.y * 0.4 + 4, -20, 20); }
      else if (r.code === 'U') { tx = b.x - d * 5; ty = clamp(b.y * 0.5 - 3, -20, 20); }
      else if (r.code === 'DJ' || r.code === 'LJ') tx = b.x;                       // the wing officials run the sideline with the ball
      else if (r.code === 'BJ') { tx = r.x0 + d * Math.max(0, ahead - 12); ty = clamp(b.y * 0.6, -18, 18); }
      else tx = r.x0 + d * Math.max(0, ahead - 10);                                // side and field judges keep the play in front of them
    } else if (over) { tx = r.code === 'R' || r.code === 'U' ? b.x - d * (r.code === 'R' ? 3 : 1.5) : r.code === 'DJ' || r.code === 'LJ' ? b.x : r.x; ty = r.code === 'R' ? b.y + 2 : r.code === 'U' ? b.y - 1.5 : r.y; speed = 3; }
    if (r.sig === 'throw' || (r.sig && t - r.sigAt < 0.6)) speed *= 0.3;           // he slows to make the call
    const ox = r.x, oy = r.y; stepTo(r, tx, ty, speed, dt);
    r.vx = (r.x - ox) / dt; r.sp = Math.hypot(r.x - ox, r.y - oy) / dt; r.run += r.sp * dt;   // r.run: distance covered (drives the leg cycle)
    if (Math.abs(r.vx) > 0.4) r.face = Math.sign(r.vx);
    if (r.sig && r.sig !== 'flagArm' && t - r.sigAt > 2.6) r.sig = null;            // signals don't last forever (the flag arm stays up)
  }
}

// Where the flag is drawn: flying from the official's hand to the spot, then lying there.
export function flagAt(S) {
  const f = S.flag; if (!f || f.by == null || S.t < f.t) return null;
  const u = clamp((S.t - f.t) / (f.land - f.t), 0, 1);
  return { x: f.x0 + (f.x - f.x0) * u, y: f.y0 + (f.y - f.y0) * u, h: u < 1 ? 1.6 + 2.2 * u * (1 - u) * 4 - 1.6 * u : 0, landed: u >= 1, spin: S.t * 14 };
}
