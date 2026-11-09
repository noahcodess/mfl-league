// Draws a player's 32x32 pixel portrait (head and shoulders, no helmet) in his team's jersey, Hoopland style:
// dark outlines, bold shading, big eyes, blocky centered numbers. Results are cached.
import { makeGrid, shade, mix, drawNumber, gridToUrl, brightness, outline } from './pixels.js';
import { drawHair } from './portraitHair.js';

const INK = '#140d0a';
// Head outline: row -> [left, right]. Symmetric around the grid's center line (15.5).
const HEAD = { 6: [11, 20], 7: [10, 21], 19: [10, 21], 20: [11, 20], 21: [12, 19], 22: [13, 18] };
for (let y = 8; y <= 18; y++) HEAD[y] = [9, 22];
const BODY = { 24: [8, 23], 25: [5, 26], 26: [3, 28], 27: [2, 29], 28: [2, 29], 29: [1, 30], 30: [1, 30], 31: [1, 30] };

function drawBackground(g, team) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const halo = (x - 15.5) ** 2 + (y - 13) ** 2 < 150;
      g.set(x, y, mix(team.color, '#0e0907', 0.52 + (y / 31) * 0.28 - (halo ? 0.12 : 0)));
    }
  }
}

function drawBody(g, team, skin, number) {
  const j = team.color, jh = shade(j, 1.22), js = shade(j, 0.7), trim = team.accent;
  Object.entries(BODY).forEach(([y, [a, b]]) => {
    y = Number(y);
    g.row(y, a, b, j);
    g.row(y, a, a + 1, jh);
    g.row(y, b - 1, b, js);
  });
  for (let y = 26; y <= 31; y++) { g.set(7, y, js); g.set(24, y, js); } // sleeve seams
  g.row(23, 13, 18, shade(skin, 0.75));
  g.row(24, 12, 19, trim); // round collar
  const ink = Math.abs(brightness(trim) - brightness(j)) > 0.3 ? trim : brightness(j) > 0.55 ? '#16110e' : '#ffffff';
  if (number != null) drawNumber(g, number, 26, ink, js);
}

function drawFace(g, L) {
  const sk = L.skin, hi = shade(sk, 1.15), sh = shade(sk, 0.82), sh2 = shade(sk, 0.66);
  for (let y = 20; y <= 22; y++) g.row(y, 13, 18, y <= 21 ? sh2 : sh);
  g.rect(8, 12, 1, 4, sk); g.rect(8, 13, 1, 2, sh);
  g.rect(23, 12, 1, 4, sh); g.rect(23, 13, 1, 2, sh2);
  Object.entries(HEAD).forEach(([y, [a, b]]) => {
    y = Number(y);
    g.row(y, a, b, sk);
    if (y >= 9) { g.set(b, y, sh); if (y >= 13) g.set(b - 1, y, sh); }
    if (y >= 8 && y <= 16) g.set(a + 1, y, hi);
  });
  g.row(7, 12, 15, hi);
  g.row(21, 12, 19, sh); g.row(22, 13, 18, sh);
  const brow = L.style === 'bald' || L.style === 'buzz' ? sh2 : shade(L.hair, 0.75);
  g.row(11, 11, 13, brow); g.row(11, 18, 20, brow);
  // Eyes: dark upper lid, white with a colored iris in the middle.
  g.row(12, 11, 13, INK); g.row(12, 18, 20, INK);
  [[11, 12, 13], [18, 19, 20]].forEach(([l, m, r]) => { g.set(l, 13, '#f4efe8'); g.set(m, 13, shade(L.eyes, 0.85)); g.set(r, 13, '#f4efe8'); g.row(14, l, r, sh); });
  g.set(16, 14, sh); g.set(16, 15, sh); g.set(15, 16, hi); g.set(16, 16, sh); g.set(15, 17, sh2); g.set(17, 17, sh2);
}

function drawMouthAndBeard(g, L) {
  const lip = mix(L.skin, '#8c3b3b', 0.38), h = L.hair, hs = shade(h, 0.75);
  const jaw = (paint) => {
    for (let y = 16; y <= 22; y++) {
      const [a, b] = HEAD[y];
      for (let x = a; x <= b; x++) if (!(y < 19 && x > 12 && x < 19)) g.set(x, y, paint(x, y));
    }
  };
  if (L.beard === 'stubble') jaw((x, y) => mix(L.skin, h, (x * 2 + y) % 3 === 0 ? 0.5 : 0.28));
  if (L.beard === 'beard') jaw((x, y) => ((x * 3 + y) % 4 === 0 ? hs : h));
  if (L.beard === 'goatee') for (let y = 20; y <= 22; y++) g.row(y, 13, 18, y % 2 ? h : hs);
  g.row(19, 14, 17, lip); g.set(13, 19, shade(L.skin, 0.7)); g.set(18, 19, shade(L.skin, 0.7));
  if (L.beard !== 'beard') g.row(20, 15, 16, shade(L.skin, 0.8));
  if (['beard', 'goatee', 'mustache'].includes(L.beard)) g.row(18, 13, 18, h);
}

function drawChain(g) {
  [[12, 25], [13, 26], [14, 26], [15, 27], [16, 27], [17, 26], [18, 26], [19, 25]].forEach(([x, y], i) => g.set(x, y, i % 2 ? '#8e939b' : '#e3e6ea'));
}

const cache = new Map();

export function portraitUrl(looks, team, number) {
  const key = JSON.stringify([looks, team.color, team.accent, number]);
  if (cache.has(key)) return cache.get(key);
  const bg = makeGrid(), fg = makeGrid();
  drawBackground(bg, team);
  drawBody(fg, team, looks.skin, number);
  drawFace(fg, looks);
  drawMouthAndBeard(fg, looks);
  drawHair(fg, looks, HEAD);
  if (looks.chain) drawChain(fg);
  outline(fg, bg, INK);
  fg.px.forEach((c, i) => { if (c) bg.px[i] = c; });
  const url = gridToUrl(bg);
  cache.set(key, url);
  return url;
}
