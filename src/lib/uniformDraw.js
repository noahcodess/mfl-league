// Draws a player in full game uniform as a 32x56 pixel sprite (same size and face as the coach sprites): his helmet model
// with the team design and facemask, shoulder pads, chest number, sleeve stripes, and all of his drip (sleeves, gloves, play sheet,
// undershirt, pants, compression shorts, leg sleeves). Helmet art lives in helmetFront.js, drip in uniformGear.js.
import { shade, brightness, drawNumber } from './pixels.js';
import { HEADS, drawFace, drawMouthAndBeard } from './portraitFace.js';
import { drawHelmetFront, drawMaskFront } from './helmetFront.js';
import { drawArms, drawLegs, dripColor, DEFAULT_DRIP } from './uniformGear.js';

const W = 32, H = 56, INK = '#140d0a';

function grid() {
  const px = new Array(W * H).fill(null);
  const g = {
    px,
    set(x, y, c) { if (c && x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = c; },
    get(x, y) { return px[y * W + x]; },
    row(y, x0, x1, c) { for (let x = x0; x <= x1; x++) g.set(x, y, c); },
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) g.row(y + j, x, x + w - 1, c); },
  };
  return g;
}

// The first color that stands out on `on` (falls back to white or near-black).
export function contrast(on, ...choices) {
  return [...choices, '#f1f3f5', '#18191c'].find((c) => c && Math.abs(brightness(c) - brightness(on)) > 0.3);
}

function drawJersey(g, C, skin, number) {
  const j = C.jersey, jh = shade(j, 1.2), js = shade(j, 0.72), trim = C.trim;
  const pads = { 23: [9, 22], 24: [5, 26], 25: [3, 28], 26: [2, 29], 27: [2, 29], 28: [2, 29], 29: [2, 29], 30: [2, 29] };
  Object.entries(pads).forEach(([y, [a, b]]) => { y = Number(y); g.row(y, a, b, j); g.set(a, y, jh); g.set(b, y, js); });
  g.row(25, 5, 11, jh); g.row(25, 20, 26, jh); // pad shine
  for (let y = 26; y <= 30; y++) { g.set(7, y, js); g.set(24, y, js); } // sleeve seams
  g.row(28, 2, 6, trim); g.row(28, 25, 29, trim); // sleeve stripes
  g.row(30, 2, 6, js); g.row(30, 25, 29, shade(j, 0.6)); // sleeve hems
  for (let y = 31; y <= 39; y++) { g.row(y, 7, 24, j); g.set(7, y, jh); g.set(24, y, js); g.set(23, y, js); }
  g.row(23, 12, 19, trim); g.row(23, 13, 18, shade(skin, 0.8)); g.row(24, 13, 18, trim); g.row(24, 14, 17, shade(skin, 0.75));
  g.row(25, 14, 17, trim); g.row(25, 15, 16, shade(trim, 0.8));
  if (number != null) drawNumber(g, number, 31, C.numbers, js);
}

const cache = new Map();

// colors: the uniform { helmet, mask, stripe, jersey, numbers, trim, pants, socks }; looks: his face; number: jersey number;
// opts: { drip, design } where design is the team's helmet design (stripe, double, plain, logo, logo_stripe).
export function uniformUrl(colors, looks, number, opts = {}) {
  const d = { ...DEFAULT_DRIP, ...(opts.drip || {}) };
  const design = opts.design || 'stripe';
  const key = JSON.stringify([colors, looks, number, d, design]);
  if (cache.has(key)) return cache.get(key);
  const fg = grid(), out = grid();
  const skin = looks.skin || '#c48a5f';
  drawJersey(fg, colors, skin, number);
  if (d.undershirt !== 'none') { const u = dripColor(d.undershirtColor, colors, '#1c1d21'); fg.row(23, 13, 18, u); fg.row(24, 14, 17, shade(u, 0.85)); }
  drawArms(fg, colors, skin, d);
  drawLegs(fg, colors, skin, d, contrast(colors.pants, colors.trim, colors.numbers, colors.jersey));
  const head = HEADS[looks.head] || HEADS.oval;
  drawFace(fg, { ...looks, style: 'bald' }, head);
  drawMouthAndBeard(fg, looks, head);
  fg.row(22, 13, 18, skin);
  drawHelmetFront(fg, colors, d.helmet, design);
  drawMaskFront(fg, colors, d.helmet);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (fg.get(x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && x + dx < W && fg.get(x + dx, y + dy))) out.set(x, y, INK);
  }
  fg.px.forEach((c, i) => { if (c) out.px[i] = c; });
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  out.px.forEach((c, i) => { if (c) { ctx.fillStyle = c; ctx.fillRect(i % W, Math.floor(i / W), 1, 1); } });
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}
