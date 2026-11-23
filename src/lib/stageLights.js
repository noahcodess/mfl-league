// The ceremony stage's moving light, drawn every frame over the still picture (320x180): theater spotlights sweeping the
// stage from the rig above, their pools on the floor, dust in the beams, a shine crossing the screen, and the warm
// flicker of the footlights and balcony lamps. level 0..1 dims it all (for the lights coming up).
import { STAGE, SCREEN, W } from './stageArt.js';
import { LAMPS } from './stageHouse.js';

const BEAMS = [   // rig spot x, color, sweep speed, phase, sweep width
  { sx: 40, c: [255, 236, 200], v: 0.23, p: 0.0, a: 70 },
  { sx: 120, c: [210, 220, 255], v: 0.31, p: 2.1, a: 85 },
  { sx: 200, c: [255, 214, 150], v: 0.27, p: 4.0, a: 85 },
  { sx: 280, c: [255, 236, 200], v: 0.19, p: 5.3, a: 70 },
];
const DUST = Array.from({ length: 70 }, (_, i) => ({ x: (i * 97.3) % W, y: 14 + ((i * 53.7) % 110), v: 0.6 + ((i * 13) % 10) / 10, s: (i * 7) % 6 }));

export function beamTargets(t) {
  return BEAMS.map((b) => ({ ...b, tx: 160 + Math.sin(t * b.v + b.p) * b.a, ty: 114 + Math.cos(t * b.v * 1.3 + b.p) * 7 }));
}

function beam(ctx, b, level) {
  const sy = -4, w0 = 2.5, w1 = 15, [r, g, bl] = b.c;
  const grad = ctx.createLinearGradient(b.sx, sy, b.tx, b.ty);
  grad.addColorStop(0, `rgba(${r},${g},${bl},${0.34 * level})`);
  grad.addColorStop(1, `rgba(${r},${g},${bl},${0.1 * level})`);
  const dx = b.tx - b.sx, dy = b.ty - sy, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  ctx.fillStyle = grad; ctx.beginPath();
  ctx.moveTo(b.sx + nx * w0, sy + ny * w0); ctx.lineTo(b.tx + nx * w1, b.ty + ny * w1 * 0.35);
  ctx.lineTo(b.tx - nx * w1, b.ty - ny * w1 * 0.35); ctx.lineTo(b.sx - nx * w0, sy - ny * w0); ctx.closePath(); ctx.fill();
  const pool = ctx.createRadialGradient(b.tx, b.ty, 0, b.tx, b.ty, 18);   // the pool of light on the floor
  pool.addColorStop(0, `rgba(${r},${g},${bl},${0.42 * level})`); pool.addColorStop(1, `rgba(${r},${g},${bl},0)`);
  ctx.save(); ctx.translate(b.tx, b.ty); ctx.scale(1, 0.32); ctx.translate(-b.tx, -b.ty);
  ctx.fillStyle = pool; ctx.fillRect(b.tx - 18, b.ty - 18, 36, 36); ctx.restore();
}

function inBeam(x, y, beams) {   // dust only shows where a beam passes
  for (const b of beams) {
    const t = (y + 4) / (b.ty + 4); if (t < 0 || t > 1) continue;
    const cx = b.sx + (b.tx - b.sx) * t, half = 2.5 + 12.5 * t;
    if (Math.abs(x - cx) < half) return 1 - Math.abs(x - cx) / half;
  }
  return 0;
}

const glow = (ctx, x, y, rad, rgb, a) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
};

// t: seconds. level: 0..1 light. beams: false to keep the spotlights off (the house lights only).
export function drawLights(ctx, t, { level = 1, beams = true } = {}) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const bs = beamTargets(t);
  if (beams && level > 0) bs.forEach((b) => beam(ctx, b, level));
  if (beams && level > 0) for (const d of DUST) {
    const x = (d.x + Math.sin(t * 0.3 + d.s) * 6 + W) % W, y = 14 + ((d.y - 14 + t * d.v * 2) % 112), k = inBeam(x, y, bs);
    if (k > 0.1) { ctx.fillStyle = `rgba(255,240,210,${(0.35 + 0.5 * k) * level * (0.6 + 0.4 * Math.sin(t * 3 + d.s))})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  }
  const sweep = ((t * 0.18) % 1.6) - 0.3;   // a shine sliding across the screen every few seconds
  if (sweep > 0 && sweep < 1) {
    const { x, y, w, h } = SCREEN, sx = x + sweep * (w + h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = `rgba(255,255,255,${0.09 * Math.max(0.3, level)})`; ctx.beginPath();
    ctx.moveTo(sx, y); ctx.lineTo(sx + 8, y); ctx.lineTo(sx + 8 - h, y + h); ctx.lineTo(sx - h, y + h); ctx.fill(); ctx.restore();
  }
  glow(ctx, SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2, 70, '120,60,200', 0.12 * (0.4 + 0.6 * level));   // the screen's glow
  for (let x = 34; x <= W - 34; x += 10) glow(ctx, x + 1.5, STAGE.lip + 3, 7, '255,200,110', (0.22 + 0.06 * Math.sin(t * 7 + x)) * (0.35 + 0.65 * level));
  LAMPS.forEach(([x, y], i) => glow(ctx, x + 1, y, 9, '255,190,100', 0.3 + 0.07 * Math.sin(t * 5 + i * 2)));
  ctx.restore();
}
