// Draws a player in full game uniform as a 32x56 pixel sprite (same size and face as the coach sprites):
// helmet with center stripe, side decals and facemask, shoulder pads, chest number, sleeve stripes, gloves, striped pants, socks, cleats.
import { shade, brightness, drawNumber } from './pixels.js';
import { HEADS, drawFace, drawMouthAndBeard } from './portraitFace.js';

const W = 32, H = 56, INK = '#140d0a';
const CLEAT = '#17171a';

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

function drawBody(g, C, skin, number) {
  const j = C.jersey, jh = shade(j, 1.2), js = shade(j, 0.72), trim = C.trim;
  // shoulder pads and sleeves
  const pads = { 23: [9, 22], 24: [5, 26], 25: [3, 28], 26: [2, 29], 27: [2, 29], 28: [2, 29], 29: [2, 29], 30: [2, 29] };
  Object.entries(pads).forEach(([y, [a, b]]) => { y = Number(y); g.row(y, a, b, j); g.set(a, y, jh); g.set(b, y, js); });
  g.row(25, 5, 11, jh); g.row(25, 20, 26, jh); // pad shine
  for (let y = 26; y <= 30; y++) { g.set(7, y, js); g.set(24, y, js); } // sleeve seams
  g.row(28, 2, 6, trim); g.row(28, 25, 29, trim); // sleeve stripes
  g.row(30, 2, 6, js); g.row(30, 25, 29, shade(j, 0.6)); // sleeve hems
  // torso
  for (let y = 31; y <= 39; y++) { g.row(y, 7, 24, j); g.set(7, y, jh); g.set(24, y, js); g.set(23, y, js); }
  // collar (V neck)
  g.row(23, 12, 19, trim); g.row(23, 13, 18, shade(skin, 0.8)); g.row(24, 13, 18, trim); g.row(24, 14, 17, shade(skin, 0.75)); g.row(25, 14, 17, trim); g.row(25, 15, 16, shade(trim, 0.8));
  // arms, gloves
  const glove = contrast(skin, trim, j);
  for (let y = 31; y <= 37; y++) { g.row(y, 3, 6, skin); g.row(y, 25, 28, shade(skin, 0.86)); g.set(6, y, shade(skin, 0.88)); }
  g.row(36, 3, 6, trim); g.row(36, 25, 28, shade(trim, 0.85)); // wristbands
  g.rect(3, 38, 4, 2, glove); g.rect(25, 38, 4, 2, shade(glove, 0.85));
  if (number != null) drawNumber(g, number, 31, C.numbers, js);
}

function drawLegs(g, C) {
  const p = C.pants, ph = shade(p, 1.18), ps = shade(p, 0.74);
  const stripe = contrast(p, C.trim, C.numbers, C.jersey);
  g.row(40, 8, 23, ps); g.set(15, 40, shade(p, 0.55)); g.set(16, 40, shade(p, 0.55)); // belt line
  for (let y = 41; y <= 48; y++) {
    g.row(y, 8, 15, p); g.row(y, 16, 23, p);
    g.set(8, y, ph); g.set(23, y, ps);
    g.set(9, y, stripe); g.set(22, y, shade(stripe, 0.88));
    if (y >= 44) { g.set(15, y, ps); g.set(16, y, INK); }
  }
  g.row(47, 10, 14, ph); g.row(47, 17, 21, ps); // knee pads
  const s = C.socks, sk = contrast(s, C.trim, C.numbers);
  for (let y = 49; y <= 52; y++) { g.row(y, 9, 14, s); g.row(y, 17, 22, shade(s, 0.88)); }
  g.row(50, 9, 14, sk); g.row(50, 17, 22, shade(sk, 0.88));
  g.row(53, 8, 14, CLEAT); g.row(53, 17, 23, CLEAT); g.row(54, 8, 15, CLEAT); g.row(54, 16, 23, CLEAT);
  g.row(55, 8, 15, '#3a3b40'); g.row(55, 16, 23, '#3a3b40');
  g.row(53, 10, 11, contrast(CLEAT, C.trim)); g.row(53, 19, 20, contrast(CLEAT, C.trim)); // cleat swoosh
}

function drawHelmet(g, C) {
  const h = C.helmet, hh = shade(h, 1.35), hs = shade(h, 0.68), stripe = C.stripe === h ? contrast(h, C.numbers) : C.stripe;
  const shell = { 2: [11, 20], 3: [9, 22], 4: [8, 23] };
  for (let y = 5; y <= 17; y++) shell[y] = [7, 24];
  shell[18] = [8, 23]; shell[19] = [9, 22];
  Object.entries(shell).forEach(([y, [a, b]]) => {
    y = Number(y);
    for (let x = a; x <= b; x++) {
      const opening = y >= 11 && x >= 10 && x <= 21;
      if (!opening) g.set(x, y, h);
    }
    g.set(a, y, y < 11 ? hh : h); g.set(b, y, hs);
  });
  g.row(3, 11, 13, hh); g.row(4, 10, 12, hh); g.row(5, 9, 10, hh); // shine
  for (let y = 11; y <= 18; y++) { g.set(23, y, hs); g.set(24, y, shade(h, 0.55)); }
  g.row(10, 10, 21, hs); // brim over the eyes
  for (let y = 2; y <= 9; y++) { g.set(15, y, stripe); g.set(16, y, stripe); }
  const decal = C.numbers === h ? contrast(h, C.stripe) : C.numbers;
  g.rect(7, 12, 2, 3, decal); g.rect(23, 12, 2, 3, shade(decal, 0.85)); // side decals
  g.set(8, 16, INK); g.set(23, 16, INK); // ear holes
}

function drawMask(g, C) {
  const m = C.mask, ms = shade(m, 0.75);
  g.row(15, 9, 22, m); g.row(18, 10, 21, m);
  for (let y = 15; y <= 19; y++) { g.set(15, y, m); g.set(16, y, ms); }
  for (let y = 15; y <= 18; y++) { g.set(9, y, m); g.set(22, y, ms); }
  g.set(10, 19, ms); g.set(21, 19, ms); g.set(11, 20, ms); g.set(20, 20, ms); // chin strap
  g.row(21, 13, 18, shade(m, 0.85)); g.row(20, 14, 17, m); // chin cup
}

const cache = new Map();

// colors: { helmet, mask, stripe, jersey, numbers, trim, pants, socks }; looks: a player's face looks; number: jersey number.
export function uniformUrl(colors, looks, number) {
  const key = JSON.stringify([colors, looks, number]);
  if (cache.has(key)) return cache.get(key);
  const fg = grid(), out = grid();
  const skin = looks.skin || '#c48a5f';
  drawBody(fg, colors, skin, number);
  drawLegs(fg, colors);
  const head = HEADS[looks.head] || HEADS.oval;
  drawFace(fg, { ...looks, style: 'bald' }, head);
  drawMouthAndBeard(fg, looks, head);
  fg.row(22, 13, 18, skin); fg.row(23, 14, 17, shade(skin, 0.8)); // neck
  drawHelmet(fg, colors);
  drawMask(fg, colors);
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
