// Draws a coach as a full-body 32x56 pixel sprite: the same face and hair as player portraits, then his shirt, pants and shoes.
// Transparent background, dark outline. Results are cached.
import { shade } from './pixels.js';
import { drawHair } from './portraitHair.js';
import { HEADS, drawFace, drawMouthAndBeard } from './portraitFace.js';

const W = 32, H = 56, INK = '#140d0a';

function tallGrid() {
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

function drawShirt(g, L) {
  const c = L.shirtColor, hi = shade(c, 1.25), sh = shade(c, 0.72), skin = L.skin;
  const short = L.shirt === 'tee' || L.shirt === 'polo';
  for (let y = 23; y <= 40; y++) {
    const [a, b] = y === 23 ? [11, 20] : y === 24 ? [8, 23] : [7, 24];
    g.row(y, a, b, c); g.set(a, y, hi); g.set(b, y, sh);
  }
  for (let y = 25; y <= 38; y++) { // arms
    const sleeve = !short || y <= 29;
    g.row(y, 4, 6, sleeve ? c : skin); g.row(y, 25, 27, sleeve ? sh : shade(skin, 0.85));
    g.set(7, y, sh); g.set(24, y, sh);
  }
  g.row(39, 4, 6, skin); g.row(39, 25, 27, shade(skin, 0.85)); g.row(40, 4, 6, shade(skin, 0.9)); g.row(40, 25, 27, shade(skin, 0.8)); // hands
  if (L.shirt === 'hoodie') {
    g.row(22, 10, 21, sh); g.row(23, 10, 21, sh); g.set(10, 24, sh); g.set(21, 24, sh); // hood
    for (let y = 25; y <= 29; y++) { g.set(14, y, '#e9e9e9'); g.set(17, y, '#e9e9e9'); } // drawstrings
    g.row(33, 11, 20, sh); for (let y = 34; y <= 36; y++) { g.set(11, y, sh); g.set(20, y, sh); } // pocket
    g.row(37, 4, 6, sh); g.row(37, 25, 27, shade(sh, 0.85)); g.row(40, 8, 23, sh); // cuffs and waistband
  }
  if (L.shirt === 'tee') { g.row(29, 4, 6, sh); g.row(29, 25, 27, sh); g.row(23, 13, 18, shade(skin, 0.8)); }
  if (L.shirt === 'polo') {
    g.row(23, 11, 20, hi); g.row(24, 12, 19, hi); g.set(15, 25, '#f2f2f2'); g.set(16, 27, '#f2f2f2'); g.row(29, 4, 6, sh); g.row(29, 25, 27, sh);
  }
  if (L.shirt === 'quarterzip') { g.row(22, 12, 19, c); g.row(23, 11, 20, hi); for (let y = 22; y <= 30; y++) g.set(15, y, '#cfd3d8'); g.set(15, 30, '#f2f2f2'); }
  if (L.shirt === 'suit') {
    for (let y = 24; y <= 32; y++) { const w = Math.max(0, 3 - Math.floor((y - 24) / 3)); g.row(y, 15 - w, 16 + w, '#f2f2f2'); }
    for (let y = 25; y <= 33; y++) { g.set(15, y, '#b3261e'); g.set(16, y, y > 26 ? '#8e1d17' : '#b3261e'); } // tie
    for (let y = 24; y <= 30; y++) { g.set(12 + Math.floor((y - 24) / 3), y, sh); g.set(19 - Math.floor((y - 24) / 3), y, sh); } // lapels
    g.set(15, 35, shade(c, 0.5)); g.set(15, 38, shade(c, 0.5));
  }
  if (L.shirt === 'jacket') {
    g.rect(7, 28, 18, 2, hi); for (let y = 24; y <= 40; y++) g.set(15, y, '#cfd3d8'); g.row(23, 11, 20, sh);
  }
}

function drawPants(g, L) {
  const c = L.pantsColor, sh = shade(c, 0.72), hi = shade(c, 1.2), skin = L.skin;
  const dressy = L.pants === 'slacks' || L.shirt === 'suit';
  g.row(41, 8, 23, L.pants === 'sweats' ? sh : dressy ? '#1b1b1f' : '#6b4a2a'); // waistband or belt
  if (L.pants !== 'sweats') g.set(15, 41, '#d9c27a');
  const legEnd = L.pants === 'shorts' ? 46 : 52;
  for (let y = 42; y <= legEnd; y++) {
    g.row(y, 9, 15, c); g.row(y, 16, 22, c);
    g.set(9, y, hi); g.set(22, y, sh); g.set(15, y, y > 44 ? sh : c); g.set(16, y, y > 44 ? INK : c);
  }
  if (L.pants === 'shorts') { for (let y = 47; y <= 52; y++) { g.row(y, 10, 14, skin); g.row(y, 17, 21, shade(skin, 0.88)); } g.row(51, 10, 14, '#f2f2f2'); g.row(51, 17, 21, '#e6e6e6'); g.row(52, 10, 14, '#f2f2f2'); g.row(52, 17, 21, '#e6e6e6'); }
  if (L.pants === 'sweats') { g.row(51, 9, 15, sh); g.row(52, 9, 15, sh); g.row(51, 16, 22, sh); g.row(52, 16, 22, sh); g.rect(10, 43, 1, 8, hi); }
  if (L.pants === 'jeans') { g.rect(9, 42, 1, 11, shade(c, 1.45)); g.rect(22, 42, 1, 11, shade(c, 1.35)); g.row(43, 10, 12, sh); g.row(43, 19, 21, sh); }
  if (L.pants === 'slacks') { g.rect(12, 43, 1, 10, hi); g.rect(19, 43, 1, 10, hi); }
  if (L.pants === 'cargo') { g.rect(9, 45, 3, 4, sh); g.rect(20, 45, 3, 4, sh); g.row(45, 9, 11, hi); g.row(45, 20, 22, hi); }
  const shoe = dressy ? '#141414' : '#f4f4f4', trim = dressy ? '#3a3a3a' : L.shirtColor;
  g.row(53, 8, 14, shoe); g.row(53, 17, 23, shoe); g.row(54, 8, 15, shoe); g.row(54, 16, 23, shoe);
  g.row(55, 8, 15, shade(shoe, 0.7)); g.row(55, 16, 23, shade(shoe, 0.7)); g.row(53, 11, 12, trim); g.row(53, 19, 20, trim);
}

function drawGlasses(g, L) {
  if (!L.glasses || L.glasses === 'none') return;
  const frame = '#101010';
  [[10, 14], [17, 21]].forEach(([a, b]) => {
    if (L.glasses === 'sun') { g.rect(a, 12, b - a + 1, 3, '#0d0d10'); g.set(a + 1, 12, '#6f7a86'); g.set(a + 2, 13, '#3a4048'); }
    else { g.row(12, a, b, frame); g.row(15, a, b, frame); g.rect(a, 12, 1, 4, frame); g.rect(b, 12, 1, 4, frame); }
  });
  g.row(12, 15, 16, frame); g.set(9, 12, frame); g.set(22, 12, frame);
}

const cache = new Map();

export function coachUrl(L) {
  const key = JSON.stringify(L);
  if (cache.has(key)) return cache.get(key);
  const fg = tallGrid(), out = tallGrid();
  drawShirt(fg, L);
  drawPants(fg, L);
  const head = HEADS[L.head] || HEADS.oval;
  drawFace(fg, L, head);
  drawMouthAndBeard(fg, L, head);
  drawHair(fg, L, head);
  drawGlasses(fg, L);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (fg.get(x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => fg.get(x + dx, y + dy) && x + dx >= 0 && x + dx < W)) out.set(x, y, INK);
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
