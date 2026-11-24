// The ceremony's cinematic light, drawn at screen resolution over the pixel art: a darkness layer with the lit places cut
// out of it (spot pools, the screen, the footlights, the trophy case and lectern lamps, the balcony lamps), then soft
// theater beams sweeping from the rig with haze and dust in them, glows, and a vignette. cam: { x, y, z } over the
// 320x180 world (z 1 = all of it).
import { STAGE, SCREEN } from './stageArt.js';
import { PLINTH, LECTERN } from './stageProps.js';
import { LAMPS } from './stageHouse.js';

export function camXf(cam, dw, dh) {
  const s = (dw / 320) * cam.z, ox = dw / 2 - cam.x * s, oy = dh / 2 - cam.y * s;
  return { s, ox, oy, X: (x) => x * s + ox, Y: (y) => y * s + oy };
}

const RIG = [{ sx: 40, c: '255,236,205', v: 0.21, p: 0, a: 72 }, { sx: 118, c: '205,215,255', v: 0.29, p: 2.1, a: 84 },
  { sx: 202, c: '255,215,160', v: 0.25, p: 4, a: 84 }, { sx: 280, c: '255,236,205', v: 0.17, p: 5.3, a: 72 }];
const DUST = Array.from({ length: 90 }, (_, i) => ({ x: (i * 97.3) % 320, y: (i * 53.7) % 130, v: 0.5 + ((i * 13) % 10) / 12, s: (i * 7) % 6 }));
let dk = null;

// Where each beam lands at time t. focus { x, y, k }: k 0..1 pulls every beam onto one spot (a winner).
export function beamTargets(t, focus) {
  return RIG.map((b, i) => {
    let tx = 160 + Math.sin(t * b.v + b.p) * b.a, ty = 112 + Math.cos(t * b.v * 1.3 + b.p) * 7;
    if (focus) { const k = focus.k ?? 1; tx += (focus.x + (i - 1.5) * 1.5 - tx) * k; ty += (focus.y - ty) * k; }
    return { ...b, tx, ty };
  });
}

const hole = (g, x, y, r, a, sy = 1) => {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, `rgba(0,0,0,${Math.min(1, a)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.translate(x, y); g.scale(1, sy); g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
};
const glow = (g, x, y, r, rgb, a, sy = 1) => {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.save(); g.translate(x, y); g.scale(1, sy); g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
};

// o: level 0..1 (the lights coming up), dark 0..1 (how dark unlit places are), beams 0..1, focus (see beamTargets),
// lamps 0..1 (the house's balcony lamps), screenRgb (the screen's glow color), dim 0..1 (everything but the focus darker).
export function drawLight(ctx, xf, t, o = {}) {
  const { level = 1, dark = 0.5, beams = 1, focus = null, lamps = 0, screenRgb = '120,70,210', dim = 0 } = o;
  const W = ctx.canvas.width, H = ctx.canvas.height, { s, X, Y } = xf, bs = beamTargets(t, focus);
  if (!dk || dk.width !== W || dk.height !== H) { dk = document.createElement('canvas'); dk.width = W; dk.height = H; }
  const g = dk.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
  g.fillStyle = `rgba(4,2,9,${Math.min(0.97, dark + (1 - level) * (0.97 - dark) + dim * 0.3)})`; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out';
  const L = level * (1 - dim * 0.75);
  hole(g, X(160), Y(96), 120 * s, 0.5 * L, 0.55);   // the general stage wash
  bs.forEach((b) => hole(g, X(b.tx), Y(b.ty), 24 * s, 0.95 * level * beams, 0.4));
  if (focus) hole(g, X(focus.x), Y(focus.y - 12), 18 * s, (focus.k ?? 1) * 0.95, 1.5);
  hole(g, X(SCREEN.x + SCREEN.w / 2), Y(SCREEN.y + SCREEN.h / 2), 84 * s, 0.8 * Math.max(0.85, L), 0.6);   // the screen glows on its own, even in the dark
  for (let x = 34; x <= 286; x += 10) hole(g, X(x + 1.5), Y(STAGE.lip + 3), 12 * s, 0.5 * L, 0.7);
  hole(g, X(PLINTH.x), Y(PLINTH.top + 4), 20 * s, 0.8 * L, 1.3);
  hole(g, X(LECTERN.x + 3), Y(LECTERN.top), 12 * s, 0.6 * L);
  hole(g, X(LECTERN.x + 7), Y(LECTERN.top + 8), 16 * s, 0.4 * L, 1.3);
  LAMPS.forEach(([x, y]) => hole(g, X(x + 1), Y(y), 11 * s, lamps * 0.9));
  hole(g, X(160), Y(146), 175 * s, (0.3 * L + 0.25 * lamps) * (o.audience ?? 1), 0.22);   // stage spill on the front rows
  ctx.drawImage(dk, 0, 0);

  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const bA = level * beams;
  if (bA > 0) bs.forEach((b) => {
    const x0 = X(b.sx), y0 = Y(-8), x1 = X(b.tx), y1 = Y(b.ty), dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const w0 = 2.2 * s, w1 = 16 * s, gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, `rgba(${b.c},${0.24 * bA})`); gr.addColorStop(0.6, `rgba(${b.c},${0.07 * bA})`); gr.addColorStop(1, `rgba(${b.c},${0.05 * bA})`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1 * 0.3);
    ctx.lineTo(x1 - nx * w1, y1 - ny * w1 * 0.3); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.closePath(); ctx.fill();
    glow(ctx, x1, y1, 22 * s, b.c, 0.3 * bA, 0.32);   // the pool on the floor
    glow(ctx, x0, y0 + 4 * s, 7 * s, b.c, 0.5 * bA);   // the lamp head flaring
    for (const d of DUST) {   // dust drifting through this beam
      const px = (d.x + Math.sin(t * 0.3 + d.s) * 6 + 320) % 320, py = (d.y + t * d.v * 2) % 130, k = (py + 8) / (b.ty + 8);
      if (k < 0 || k > 1) continue;
      const cx = b.sx + (b.tx - b.sx) * k, half = 2.2 + 13.8 * k;
      if (Math.abs(px - cx) < half) { ctx.fillStyle = `rgba(255,240,215,${0.55 * bA * (1 - Math.abs(px - cx) / half) * (0.6 + 0.4 * Math.sin(t * 3 + d.s))})`; ctx.fillRect(X(px), Y(py), Math.max(1, s * 0.6), Math.max(1, s * 0.6)); }
    }
  });
  if (focus) glow(ctx, X(focus.x), Y(focus.y + 1), 14 * s, '255,236,200', 0.22 * (focus.k ?? 1), 0.3);   // the pool at his feet
  glow(ctx, X(SCREEN.x + SCREEN.w / 2), Y(SCREEN.y + SCREEN.h / 2), 80 * s, screenRgb, 0.16 * Math.max(0.4, L), 0.6);
  for (let x = 34; x <= 286; x += 10) glow(ctx, X(x + 1.5), Y(STAGE.lip + 3), 7 * s, '255,200,110', (0.32 + 0.08 * Math.sin(t * 7 + x)) * Math.max(0.3, L), 0.7);
  glow(ctx, X(PLINTH.x), Y(PLINTH.top - 5), 10 * s, '255,225,160', 0.3 * L);
  glow(ctx, X(LECTERN.x + 2.75), Y(LECTERN.top - 2), 6 * s, '255,225,150', 0.4 * L);
  LAMPS.forEach(([x, y], i) => glow(ctx, X(x + 1), Y(y), 9 * s, '255,190,100', lamps * (0.4 + 0.08 * Math.sin(t * 5 + i * 2))));
  const haze = ctx.createLinearGradient(0, Y(10), 0, Y(80));   // stage haze catching the light
  haze.addColorStop(0, `rgba(150,120,200,${0.05 * level})`); haze.addColorStop(1, 'rgba(150,120,200,0)');
  ctx.fillStyle = haze; ctx.fillRect(X(STAGE.x0), Y(10), (STAGE.x1 - STAGE.x0) * s, 70 * s);
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.75);   // vignette
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
