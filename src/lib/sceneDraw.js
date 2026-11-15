// Draws the live play onto the broadcast canvas: the line of scrimmage and first-down line before the snap, the kickoff
// tee, shadows, every player in the right pose and facing (scenePose), the ball (sceneBall) and any flag.
import { FY0, FY1, YD, MID_Y, yardX } from './fieldLayout.js';
import { sprite } from './fieldSprite.js';
import { lookAt } from './scenePose.js';
import { drawBall } from './sceneBall.js';

export const SPRITE_PX = 0.5; // world pixels per sprite pixel: a player stands about 2 yards tall, like the Drip tab art shrunk down

// ctx: the screen canvas. S: the live scene (sceneCore). cam: { x, y, zoom } in world pixels. looks: { playerId: sprite look }.
export function drawScene(ctx, S, cam, looks) {
  const t = S.t, px = (cam.zoom * ctx.canvas.width) / 640, sp = px * SPRITE_PX, cw = ctx.canvas.width, ch = ctx.canvas.height;
  const sx = (yd) => Math.round((yardX(yd) - cam.x) * px + cw / 2), sy = (lat) => Math.round((MID_Y + lat * YD - cam.y) * px + ch / 2);
  const top = Math.round((FY0 - cam.y) * px + ch / 2), bottom = Math.round((FY1 - cam.y) * px + ch / 2);
  ctx.imageSmoothingEnabled = false;
  if (S.lines && t < S.T0 + 0.4) { // broadcast lines, gone right after the snap
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#2f7de1'; ctx.fillRect(sx(S.lines.los) - px, top, 2 * px, bottom - top);
    const f = S.lines.first; if (f != null && f > 0 && f < 100) { ctx.fillStyle = '#ffd83a'; ctx.fillRect(sx(f) - px, top, 2 * px, bottom - top); }
    ctx.globalAlpha = 1;
  }
  if (S.tee && t < S.tee.t1 + 0.6) { ctx.fillStyle = '#ff7a1a'; ctx.fillRect(sx(S.tee.x) - Math.round(1.5 * sp), sy(S.tee.y) - Math.round(4 * sp), Math.round(3 * sp), Math.round(4 * sp)); }
  const list = S.actors.slice().sort((m, n) => m.y - n.y), holder = S.ball.holder;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (const a of list) ctx.fillRect(sx(a.x) - (a.down ? 13 : 7) * px, sy(a.y) - 1.5 * px, (a.down ? 26 : 14) * px, 3 * px);
  for (const a of list) {
    const look = looks[a.id]; if (!look) continue;
    const L = lookAt(a, t, S, holder), img = sprite(look, L.view, L.pose, L.frame, L.face), X = Math.round(sx(a.x) - img.footX * sp), Y = Math.round(sy(a.y) - img.footY * sp);
    ctx.drawImage(img, X, Y, Math.round(img.width * sp), Math.round(img.height * sp));
    a.handAt = [X + img.hand[0] * sp, Y + img.hand[1] * sp];   // where his hand is on screen, so a carried ball sits in it
  }
  drawBall(ctx, S, { sx, sy, px, sp, yd: YD });
  if (S.flag && t >= S.flag.t) { ctx.fillStyle = '#ffd400'; ctx.fillRect(sx(S.flag.x) + 4 * px, sy(S.flag.y) - 2 * px, 4 * px, 3 * px); }
}
