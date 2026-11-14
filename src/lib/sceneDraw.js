// Draws one moment of a play scene onto the broadcast canvas: the line of scrimmage and first-down line, every player in
// the right pose (running, blocking, throwing, down on the turf), shadows, the ball in the air or in someone's hands.
import { FY0, FY1, YD, MID_Y, yardX } from './fieldLayout.js';
import { sprite, SW, SH, FOOT_X, FOOT_Y } from './fieldSprite.js';

const lerp = (a, b, k) => a + (b - a) * k;
// Where an actor is at time t (yards) and whether he's moving.
export function posAt(a, t) {
  const k = a.keys; let i = k.length - 1;
  if (t <= k[0].t) return { x: k[0].x, y: k[0].y, dx: 0, moving: false };
  while (i > 0 && k[i].t > t) i--;
  const A = k[i], B = k[i + 1];
  if (!B) return { x: A.x, y: A.y, dx: 0, moving: false };
  const u = (t - A.t) / Math.max(0.001, B.t - A.t);
  return { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), dx: B.x - A.x, moving: Math.hypot(B.x - A.x, B.y - A.y) > 0.15 };
}
// Where the ball is at time t: { x, y (yards), h (height in yards), held }.
export function ballAt(S, t) {
  let st = null; for (const b of S.ball) if (b.t <= t) st = b;
  if (!st) return null;
  if (st.kind === 'held') { const a = S.by[st.id], p = a && posAt(a, t); return p ? { x: p.x, y: p.y, h: 0.9, held: true } : null; }
  if (st.kind === 'fly') { const u = Math.min(1, (t - st.t) / Math.max(0.01, st.t1 - st.t)); return { x: lerp(st.x0, st.x1, u), y: lerp(st.y0, st.y1, u), h: 0.8 + st.h * 4 * u * (1 - u), spin: u < 1 }; }
  return { x: st.x, y: st.y, h: 0.1 };
}

// ctx: the screen canvas. cam: { x, y, zoom } in world pixels. looks: { playerId: sprite look }. t: seconds into the scene.
export function drawScene(ctx, S, t, cam, looks) {
  const px = (cam.zoom * ctx.canvas.width) / 640, cw = ctx.canvas.width, ch = ctx.canvas.height;
  const sx = (yd) => Math.round((yardX(yd) - cam.x) * px + cw / 2), sy = (lat) => Math.round((MID_Y + lat * YD - cam.y) * px + ch / 2);
  const top = Math.round((FY0 - cam.y) * px + ch / 2), bottom = Math.round((FY1 - cam.y) * px + ch / 2);
  ctx.imageSmoothingEnabled = false;
  if (t < S.T0 + 0.4 && S.play.kind !== 'kickoff') { // broadcast lines, gone right after the snap
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#2f7de1'; ctx.fillRect(sx(S.los) - px, top, 2 * px, bottom - top);
    if (S.first != null && S.first > 0 && S.first < 100) { ctx.fillStyle = '#ffd83a'; ctx.fillRect(sx(S.first) - px, top, 2 * px, bottom - top); }
    ctx.globalAlpha = 1;
  }
  const list = S.actors.map((a) => ({ a, p: posAt(a, t) })).sort((m, n) => m.p.y - n.p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  list.forEach(({ a, p }) => { const down = a.down != null && t >= a.down && !(a.upAt && t >= a.upAt); ctx.fillRect(sx(p.x) - (down ? 9 : 5) * px, sy(p.y) - px, (down ? 18 : 10) * px, 3 * px); });
  list.forEach(({ a, p }) => {
    const look = looks[a.id] || looks[a.side]; if (!look) return;
    const down = a.down != null && t >= a.down && !(a.upAt && t >= a.upAt), set = a.poses.find((q) => t >= q.t0 && t < q.t1);
    const face = Math.abs(p.dx) > 0.05 ? (p.dx > 0 ? 1 : -1) : a.face;
    let name = down ? 'down' : set ? set.pose : p.moving ? 'run' : t < S.T0 ? a.idle : 'stand', frame = 0;
    if (name === 'run') frame = Math.floor(t * 10 + a.keys[0].y) & 3; else if (name === 'cheer' || name === 'block') frame = Math.floor(t * 4 + a.keys[0].y) & 1; else if (name === 'throw') frame = set && t > set.t0 + 0.12 ? 1 : 0;
    ctx.drawImage(sprite(look, name, frame, face), sx(p.x) - FOOT_X * px, sy(p.y) - FOOT_Y * px, SW * px, SH * px);
  });
  const b = ballAt(S, t);
  if (b) {
    const bx = sx(b.x), by = sy(b.y);
    if (!b.held) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx - 2 * px, by - px, 4 * px, 2 * px); }
    const y = by - Math.round(b.h * YD * px), wide = !b.spin || Math.floor(t * 12) % 2 === 0;
    ctx.fillStyle = '#141018'; ctx.fillRect(bx - (wide ? 3 : 2) * px, y - 2 * px, (wide ? 6 : 4) * px, 4 * px);
    ctx.fillStyle = '#8a4b22'; ctx.fillRect(bx - (wide ? 2 : 1) * px, y - px, (wide ? 4 : 2) * px, 2 * px); ctx.fillStyle = '#f2f2f2'; ctx.fillRect(bx - px, y - px, 2 * px, px);
  }
  if (S.flag && t >= S.flag.t) { const f = S.actors[0] && posAt(S.actors[0], t); ctx.fillStyle = '#ffd400'; ctx.fillRect(sx(S.los) + 6 * px, sy(f ? 3 : 0), 4 * px, 3 * px); }
}
