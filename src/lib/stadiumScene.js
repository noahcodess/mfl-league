// Stadium scene basics: a 320x180 pixel canvas, drawing helpers, a seeded random so scenes don't flicker, and the sky.
// env = { time: 'day' | 'dusk' | 'night', weather: 'clear' } is passed everywhere so time of day and weather can be switched on later
// (only 'day' and 'clear' are used today; 'night' already turns the stadium lights on).
import { shade, mix } from './pixels.js';

export const SW = 320, SH = 180;
export { shade, mix };

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function painter(ctx) {
  const p = {
    ctx,
    rect(x, y, w, h, c) { if (!c || w <= 0 || h <= 0) return; ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    px(x, y, c) { p.rect(x, y, 1, 1, c); },
    // horizontal bands from c1 (top) to c2 (bottom), with a checker dither between bands for the 8-bit look
    bands(x, y, w, h, c1, c2, n = 8) {
      const bh = h / n;
      for (let i = 0; i < n; i++) {
        const c = mix(c1, c2, i / (n - 1));
        p.rect(x, y + i * bh, w, Math.ceil(bh), c);
        if (i < n - 1) { const c3 = mix(c1, c2, (i + 1) / (n - 1)); for (let xx = x + ((i % 2) ? 1 : 0); xx < x + w; xx += 2) p.px(xx, Math.round(y + (i + 1) * bh) - 1, c3); }
      }
    },
    poly(pts, c) {
      ctx.fillStyle = c; ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y))));
      ctx.closePath(); ctx.fill();
    },
    ellipse(cx, cy, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(Math.round(cx), Math.round(cy), rx, ry, 0, 0, Math.PI * 2); ctx.fill(); },
    line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) p.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
    text(s, x, y, c, size = 8, align = 'left') { ctx.fillStyle = c; ctx.font = `bold ${size}px monospace`; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(s, Math.round(x), Math.round(y)); },
  };
  return p;
}

const SKIES = {
  day: { top: '#3f7fd6', bottom: '#a9d4f5', cloud: '#ffffff', light: 1 },
  dusk: { top: '#2b2f6b', bottom: '#f39a5b', cloud: '#f7c7a3', light: 0.8 },
  night: { top: '#070a1c', bottom: '#1c2550', cloud: '#2a3466', light: 0.45 },
};
export const sky = (env) => SKIES[env?.time] || SKIES.day;
export const lightsOn = (env) => env?.time === 'night' || env?.time === 'dusk';

// Sky for open-air biomes, with drifting pixel clouds. `cam` shifts the clouds for parallax.
export function drawSky(p, env, t, cam = 0, palette) {
  const s = palette || sky(env);
  p.bands(0, 0, SW, SH, s.top, s.bottom, 10);
  if (env?.time === 'night') { const r = rng(7); for (let i = 0; i < 70; i++) p.px(r() * SW, r() * SH * 0.6, r() > 0.8 ? '#ffffff' : '#9aa6d8'); }
  const r = rng(11);
  for (let i = 0; i < 6; i++) {
    const w = 30 + r() * 40, y = 12 + r() * 50, x = ((r() * 520 + t * 12 - cam * 0.2) % 520) - 100;
    p.rect(x, y, w, 5, s.cloud); p.rect(x + 6, y - 4, w - 14, 4, s.cloud); p.rect(x + 3, y + 5, w - 6, 2, shade(s.cloud, 0.88));
  }
}

// Crowd colors: mostly the home team's colors with some white and away fans; Bloodbath turns the whole place red.
export function crowdColors(team, mode) {
  if (mode === 'bloodbath') return ['#b00b0a', '#d01414', '#8a0909', '#b00b0a', '#e02424', '#1f2024'];
  const c = team.color;
  return [c, c, c, c, shade(c, 0.8), shade(c, 0.8), shade(c, 1.15), team.accent, '#2b2f38', shade(c, 0.65)];
}

// A block of crowd: rows of 2px heads/shirts that bob a little over time.
export function drawCrowd(p, x, y, w, h, colors, t, seed = 1, size = 2) {
  const r = rng(seed);
  for (let yy = y; yy < y + h; yy += size + 1) for (let xx = x + ((yy / (size + 1)) % 2 ? 1 : 0); xx < x + w; xx += size + 1) {
    const c = colors[Math.floor(r() * colors.length)];
    const bob = Math.sin(t * 6 + xx * 0.7 + yy) > 0.92 ? -1 : 0;
    p.rect(xx, yy + bob, size, size, c);
    if (r() > 0.94) p.px(xx, yy + bob - 1, '#f3d2b0');
  }
}
