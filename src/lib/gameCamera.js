// The one game camera: it looks at a spot in the world (x, y) at a zoom level, never leaves the stadium, glides toward its
// target, and copies what it sees onto the screen. The same camera will follow the ball when games are played.
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, MID_Y, YD, yardX } from './fieldLayout.js';

// Widest view shows about 80 yards across, so the field never looks tiny; closest is the front row of fans.
export const MIN_ZOOM = VIEW_W / (80 * YD), MAX_ZOOM = 2.4;

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

// Move the camera a fraction k of the way to its target (call every frame).
export function glide(cam, target, k = 0.08) {
  const t = clampCam(target);
  return { x: cam.x + (t.x - cam.x) * k, y: cam.y + (t.y - cam.y) * k, zoom: cam.zoom + (t.zoom - cam.zoom) * k };
}

export function blit(ctx, world, cam) {
  const w = VIEW_W / cam.zoom, h = VIEW_H / cam.zoom;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0c0f'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.drawImage(world, cam.x - w / 2, cam.y - h / 2, w, h, 0, 0, VIEW_W, VIEW_H);
}
