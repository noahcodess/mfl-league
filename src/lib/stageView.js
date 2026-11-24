// Puts one frame of the ceremony together on a screen-sized canvas: the still pixel stage seen through a camera, the big
// screen's live content, the nominees, the audience (arriving, clapping, leaving), then the light and the name plates.
import { drawStage, W, H } from './stageArt.js';
import { drawScreen } from './stageScreen.js';
import { drawLight, camXf } from './stageLight.js';
import { buildAudience, drawAudienceFrame } from './stageCrowd.js';

// The still picture, drawn once. house: the whole auditorium (the show) or just the stage (the Live tab).
// theme: showTheme (the Craft Bowl's colors). The canvas is twice the world, for half-unit detail.
export function buildStill(house, theme) {
  const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
  drawStage(c.getContext('2d'), { house, theme });
  return { canvas: c, aud: house ? buildAudience() : null };
}

// cam: { x, y, z }. o: { light (drawLight's options), screen: { mode, d, p }, clap, crowd: { T, leave } (stageCrowd),
// actors(ctx) → anything, plates(ctx, xf, a) }.
export function renderStage(ctx, still, cam, t, o = {}) {
  const dw = ctx.canvas.width, dh = ctx.canvas.height, xf = camXf(cam, dw, dh);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05020a'; ctx.fillRect(0, 0, dw, dh);
  ctx.setTransform(xf.s, 0, 0, xf.s, xf.ox, xf.oy); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(still.canvas, 0, 0, W, H);
  if (o.screen) drawScreen(ctx, t, o.screen.mode, o.screen.d, o.screen.p ?? 1, o.theme);
  const a = o.actors ? o.actors(ctx) : null;
  if (still.aud) drawAudienceFrame(ctx, still.aud, o.crowd?.T ?? 1e6, o.crowd?.leave || {}, t, o.clap || 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawLight(ctx, xf, t, o.light || {});
  if (o.plates) o.plates(ctx, xf, a);
  return xf;
}

const lerp = (a, b, k) => a + (b - a) * k;
export const easeIO = (x) => { const k = Math.min(1, Math.max(0, x)); return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; };
export const camLerp = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
