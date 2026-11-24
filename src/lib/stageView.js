// Puts one frame of the ceremony together on a screen-sized canvas: the still pixel stage seen through a camera, the big
// screen's live content, the nominees, the audience's clapping hands, then the cinematic light and the name plates.
import { drawStage, W, H } from './stageArt.js';
import { drawScreen } from './stageScreen.js';
import { drawLight, camXf } from './stageLight.js';

// The still picture, drawn once. house: the whole auditorium (the show) or just the stage (the Live tab).
export function buildStill(house) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const heads = drawStage(c.getContext('2d'), { house });
  return { canvas: c, heads };
}

// Hands coming together over the front rows. clap 0..1: how many are clapping.
function hands(ctx, heads, t, clap) {
  if (clap <= 0) return;
  heads.forEach((h, n) => {
    if (h.k < 1 || ((n * 37) % 100) / 100 > clap * 0.7) return;
    const r = h.r, sep = r * 0.12 + r * 0.38 * (0.5 + 0.5 * Math.sin(t * 13 + n * 2.3)), y = h.y - r * 0.9 + Math.sin(t * 13 + n) * 0.4, sz = Math.max(1.2, r * 0.42);
    for (const dx of [-sep, sep]) { const hx = h.x + dx - sz / 2 + r * 0.5; ctx.fillStyle = '#6e5040'; ctx.fillRect(hx, y, sz, sz * 1.4); ctx.fillStyle = '#d8aa80'; ctx.fillRect(hx, y, sz, Math.min(1, sz * 0.4)); ctx.fillStyle = '#0c0810'; ctx.fillRect(hx, y + sz * 1.4, sz, sz); }
  });
}

// cam: { x, y, z }. o: { light (drawLight's options), screen: { mode, d, p }, clap, actors(ctx) → anything, plates(ctx, xf, a) }.
export function renderStage(ctx, still, cam, t, o = {}) {
  const dw = ctx.canvas.width, dh = ctx.canvas.height, xf = camXf(cam, dw, dh);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05020a'; ctx.fillRect(0, 0, dw, dh);
  ctx.setTransform(xf.s, 0, 0, xf.s, xf.ox, xf.oy); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(still.canvas, 0, 0);
  if (o.screen) drawScreen(ctx, t, o.screen.mode, o.screen.d, o.screen.p ?? 1);
  const a = o.actors ? o.actors(ctx) : null;
  hands(ctx, still.heads, t, o.clap || 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawLight(ctx, xf, t, o.light || {});
  if (o.plates) o.plates(ctx, xf, a);
  return xf;
}

const lerp = (a, b, k) => a + (b - a) * k;
export const easeIO = (x) => { const k = Math.min(1, Math.max(0, x)); return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; };
export const camLerp = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
