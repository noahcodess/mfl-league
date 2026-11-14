// Draws one moment of a play scene onto the broadcast canvas: the line of scrimmage and first-down line, every player in
// the right pose (running, blocking, throwing, down on the turf), shadows, the ball in the air or in someone's hands.
import { FY0, FY1, YD, MID_Y, yardX } from './fieldLayout.js';
import { sprite } from './fieldSprite.js';
import { lookAt } from './scenePose.js';

export const SPRITE_PX = 0.5; // world pixels per sprite pixel: a player stands about 2 yards tall, like the Drip tab art shrunk down

const lerp = (a, b, k) => a + (b - a) * k;
// Where an actor is at time t (yards) and whether he's moving.
export function posAt(a, t) {
  const k = a.keys; let i = k.length - 1;
  if (t <= k[0].t) return { x: k[0].x, y: k[0].y, dx: 0, dy: 0, moving: false, speed: 0 };
  while (i > 0 && k[i].t > t) i--;
  const A = k[i], B = k[i + 1];
  if (!B) return { x: A.x, y: A.y, dx: 0, dy: 0, moving: false, speed: 0 };
  const u = (t - A.t) / Math.max(0.001, B.t - A.t);
  const dist = Math.hypot(B.x - A.x, B.y - A.y);
  return { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), dx: B.x - A.x, dy: B.y - A.y, moving: dist > 0.15, speed: dist / Math.max(0.001, B.t - A.t) };
}
// Where the ball is at time t: { x, y (yards), h (height in yards), held }.
export function ballAt(S, t) {
  let st = null; for (const b of S.ball) if (b.t <= t) st = b;
  if (!st) return null;
  if (st.kind === 'held') { // tucked in his hands: out in front on a profile, at the chest facing the camera
    const a = S.by[st.id], p = a && posAt(a, t), v = a?.vis;
    if (!p) return null;
    const side = !v || v.view === 'side';
    return { x: p.x + (side ? (v?.face || a.face) * 0.22 : 0), y: p.y + (v?.view === 'front' ? 0.08 : 0), h: 0.62, held: true, hide: v?.view === 'back' };
  }
  if (st.kind === 'fly') { const u = Math.min(1, (t - st.t) / Math.max(0.01, st.t1 - st.t)); return { x: lerp(st.x0, st.x1, u), y: lerp(st.y0, st.y1, u), h: 0.8 + st.h * 4 * u * (1 - u), spin: u < 1 }; }
  return { x: st.x, y: st.y, h: S.tee && t < S.tee.t1 && st.x === S.tee.x ? 0.22 : 0.1 };
}

// ctx: the screen canvas. cam: { x, y, zoom } in world pixels. looks: { playerId: sprite look }. t: seconds into the scene.
export function drawScene(ctx, S, t, cam, looks) {
  const px = (cam.zoom * ctx.canvas.width) / 640, sp = px * SPRITE_PX, cw = ctx.canvas.width, ch = ctx.canvas.height;
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
  list.forEach(({ a, p }) => { const down = a.down != null && t >= a.down && !(a.upAt && t >= a.upAt); ctx.fillRect(sx(p.x) - (down ? 13 : 7) * px, sy(p.y) - 1.5 * px, (down ? 26 : 14) * px, 3 * px); });
  if (S.tee && t < S.tee.t1 + 0.6) { ctx.fillStyle = '#ff7a1a'; ctx.fillRect(sx(S.tee.x) - Math.round(1.5 * sp), sy(S.tee.y) - Math.round(4 * sp), Math.round(3 * sp), Math.round(4 * sp)); }
  list.forEach(({ a, p }) => {
    const look = looks[a.id] || looks[a.side]; if (!look) return;
    const L = lookAt(a, p, t, S), img = sprite(look, L.view, L.pose, L.frame, L.face);
    ctx.drawImage(img, Math.round(sx(p.x) - img.footX * sp), Math.round(sy(p.y) - img.footY * sp), Math.round(img.width * sp), Math.round(img.height * sp));
  });
  const b = ballAt(S, t);
  if (b && !b.hide) { // the ball, drawn in the same pixel size as the players: dark outline, brown leather, white laces
    const bx = sx(b.x), by = sy(b.y), u = sp, P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(bx + x * u), Math.round(y), Math.round(w * u), Math.round(h * u)); };
    if (!b.held) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(bx - 3 * u), by - Math.round(u), Math.round(6 * u), Math.round(2 * u)); }
    const y = by - Math.round(b.h * YD * px) - 3 * u, wide = !b.spin || Math.floor(t * 14) % 2 === 0, hw = wide ? 4 : 2.5;
    P(-hw, y, hw * 2, 5, '#141018'); P(-hw + 1, y + u, hw * 2 - 2, 3, '#8a4b22'); P(-hw + 1, y + u, hw * 2 - 2, 1, '#a8612f');
    if (wide) { P(-1.5, y + 2 * u, 3, 1, '#f2f2f2'); }
  }
  if (S.flag && t >= S.flag.t) { const f = S.actors[0] && posAt(S.actors[0], t); ctx.fillStyle = '#ffd400'; ctx.fillRect(sx(S.los) + 6 * px, sy(f ? 3 : 0), 4 * px, 3 * px); }
}
