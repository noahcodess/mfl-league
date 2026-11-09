// Draws a player's 32x32 pixel portrait (head and shoulders, no helmet) in his team's jersey. Results are cached.
import { makeGrid, shade, mix, drawNumber, gridToUrl, brightness } from './pixels.js';
import { drawHair } from './portraitHair.js';

// Head outline: row -> [left, right].
const HEAD = { 6: [11, 20], 7: [10, 21], 19: [10, 21], 20: [11, 20], 21: [12, 19], 22: [13, 18] };
for (let y = 8; y <= 18; y++) HEAD[y] = [9, 22];
const BODY = { 24: [9, 22], 25: [6, 25], 26: [4, 27], 27: [2, 29], 28: [2, 29], 29: [2, 29], 30: [2, 29], 31: [2, 29] };

function drawBackground(g, team) {
  const base = team.color;
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const halo = (x - 15.5) ** 2 + (y - 13) ** 2 < 150;
      g.set(x, y, mix(base, '#0e0907', 0.5 + (y / 31) * 0.3 - (halo ? 0.12 : 0)));
    }
  }
}

function drawBody(g, team, skin, number) {
  const j = team.color, jh = shade(j, 1.25), js = shade(j, 0.72), trim = team.accent;
  Object.entries(BODY).forEach(([y, [a, b]]) => {
    y = Number(y);
    g.row(y, a, b, j);
    g.set(a, y, jh); g.set(a + 1, y, y > 25 ? jh : j);
    g.set(b, y, js); g.set(b - 1, y, js);
  });
  for (let y = 26; y <= 31; y++) { g.set(8, y, js); g.set(23, y, js); }
  g.row(24, 13, 18, shade(skin, 0.8)); g.row(25, 14, 17, shade(skin, 0.8));
  [[12, 24], [19, 24], [13, 25], [18, 25]].forEach(([x, y]) => g.set(x, y, trim));
  g.row(26, 14, 17, trim);
  // Trim color for the number unless it would blend into the jersey; then plain white or near-black.
  const ink = Math.abs(brightness(trim) - brightness(j)) > 0.3 ? trim : brightness(j) > 0.55 ? '#16110e' : '#ffffff';
  if (number != null) drawNumber(g, number, 16, 27, ink, js);
}

function drawFace(g, L) {
  const sk = L.skin, hi = shade(sk, 1.16), sh = shade(sk, 0.82), sh2 = shade(sk, 0.66);
  for (let y = 20; y <= 23; y++) g.row(y, 13, 18, y <= 21 ? sh2 : sh);
  g.rect(8, 12, 1, 4, sk); g.rect(8, 13, 1, 2, sh);
  g.rect(23, 12, 1, 4, sh); g.rect(23, 13, 1, 2, sh2);
  Object.entries(HEAD).forEach(([y, [a, b]]) => {
    y = Number(y);
    g.row(y, a, b, sk);
    if (y >= 9) { g.set(b, y, sh); g.set(b - 1, y, y >= 13 ? sh : sk); }
    if (y >= 8 && y <= 16) g.set(a + 1, y, hi);
  });
  g.row(7, 12, 15, hi);
  g.row(21, 12, 19, sh); g.row(22, 13, 18, sh);
  const brow = L.style === 'bald' || L.style === 'buzz' ? sh2 : shade(L.hair, 0.8);
  g.row(11, 11, 13, brow); g.row(11, 18, 20, brow);
  g.row(12, 11, 13, sh); g.row(12, 18, 20, sh);
  [[11, 12, 13], [18, 19, 20]].forEach(([l, m, r]) => { g.set(l, 13, '#f2ece4'); g.set(m, 13, L.eyes); g.set(r, 13, '#f2ece4'); g.set(m, 14, sh); });
  g.set(16, 14, sh); g.set(16, 15, sh); g.set(15, 16, hi); g.set(16, 16, sh); g.set(15, 17, sh2); g.set(17, 17, sh2);
  g.row(17, 13, 13, sh); g.row(17, 18, 18, sh);
}

function drawMouthAndBeard(g, L) {
  const lip = mix(L.skin, '#8c3b3b', 0.35), h = L.hair, hs = shade(h, 0.75);
  const jaw = (paint) => {
    for (let y = 16; y <= 22; y++) {
      const [a, b] = HEAD[y];
      for (let x = a; x <= b; x++) {
        const cheek = y < 19 && x > 12 && x < 19;
        if (!cheek) g.set(x, y, paint(x, y));
      }
    }
  };
  if (L.beard === 'stubble') jaw((x, y) => ((x + y) % 2 === 0 ? mix(L.skin, h, 0.5) : g.get(x, y)));
  if (L.beard === 'beard') jaw((x, y) => ((x * 3 + y) % 4 === 0 ? hs : h));
  if (L.beard === 'goatee') for (let y = 20; y <= 22; y++) g.row(y, 13, 18, (y % 2) ? h : hs);
  g.row(19, 14, 17, lip); g.row(20, 15, 16, shade(L.skin, 0.8));
  if (L.beard === 'beard') g.row(20, 15, 16, hs);
  if (['beard', 'goatee', 'mustache'].includes(L.beard)) g.row(18, 13, 18, h);
}

function drawChain(g) {
  [[12, 24], [13, 25], [14, 25], [15, 26], [16, 26], [17, 25], [18, 25], [19, 24]].forEach(([x, y], i) => g.set(x, y, i % 2 ? '#8e939b' : '#e3e6ea'));
}

const cache = new Map();

export function portraitUrl(looks, team, number) {
  const key = JSON.stringify([looks, team.color, team.accent, number]);
  if (cache.has(key)) return cache.get(key);
  const g = makeGrid();
  drawBackground(g, team);
  drawBody(g, team, looks.skin, number);
  drawFace(g, looks);
  drawMouthAndBeard(g, looks);
  drawHair(g, looks, HEAD);
  if (looks.chain) drawChain(g);
  const url = gridToUrl(g);
  cache.set(key, url);
  return url;
}
