// The one game camera: it looks at a spot in the world (x, y) at a zoom level, never leaves the stadium, glides toward its
// target, and copies what it sees onto the screen. The same camera will follow the ball when games are played.
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, MID_Y, YD, yardX } from './fieldLayout.js';

// Widest view shows about 80 yards across, so the field never looks tiny; closest is the front row of fans.
export const MIN_ZOOM = VIEW_W / (80 * YD), MAX_ZOOM = 3.6;   // 3.6 only for the close-up on an official making a call

export function clampCam(c) {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, c.zoom)), hw = VIEW_W / zoom / 2, hh = VIEW_H / zoom / 2;
  return {
    zoom,
    x: hw * 2 >= WORLD_W ? WORLD_W / 2 : Math.max(hw, Math.min(WORLD_W - hw, c.x)),
    y: hh * 2 >= WORLD_H ? WORLD_H / 2 : Math.max(hh, Math.min(WORLD_H - hh, c.y)),
  };
}

// Named camera spots. at(yard) looks at any yard line.
export const SPOTS = {
  wide: { label: 'Wide', cam: { x: yardX(50), y: MID_Y, zoom: MIN_ZOOM } },
  midfield: { label: 'Midfield', cam: { x: yardX(50), y: MID_Y, zoom: 1.1 } },
  left: { label: 'Left end zone', cam: { x: yardX(-2), y: MID_Y, zoom: 1 } },
  right: { label: 'Right end zone', cam: { x: yardX(102), y: MID_Y, zoom: 1 } },
  stands: { label: 'Front row', cam: { x: yardX(50), y: 0, zoom: 2.2 } },
};
export const at = (yard, zoom = 1.1) => ({ x: yardX(yard), y: MID_Y, zoom });

// Move the camera a fraction k of the way to its target (call every frame). Once it's as good as there it stops dead, so a
// still camera never keeps creeping by tiny fractions (that made the grass and logos crawl).
export function glide(cam, target, k = 0.08) {
  const t = clampCam(target);
  if (Math.abs(t.x - cam.x) < 0.2 && Math.abs(t.y - cam.y) < 0.2 && Math.abs(t.zoom - cam.zoom) < 0.002) return t;
  return { x: cam.x + (t.x - cam.x) * k, y: cam.y + (t.y - cam.y) * k, zoom: cam.zoom + (t.zoom - cam.zoom) * k };
}

// The screen canvas can be bigger than the camera's 640x360 view (broadcast shots are). The view is lined up on whole screen
// pixels, so world pixels never land half way between two of them and flicker.
export function blit(ctx, world, cam) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height, px = (cam.zoom * cw) / VIEW_W, w = cw / px, h = ch / px;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0c0f'; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(world, Math.round((cam.x - w / 2) * px) / px, Math.round((cam.y - h / 2) * px) / px, w, h, 0, 0, cw, ch);
}
