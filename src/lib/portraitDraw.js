// Draws a player's 32x32 pixel portrait (head and shoulders, no helmet) in his team's jersey, Hoopland style:
// dark outlines, bold shading, big eyes, blocky centered numbers. Results are cached.
import { makeGrid, shade, mix, drawNumber, gridToUrl, brightness, outline } from './pixels.js';
import { drawHair } from './portraitHair.js';
import { HEADS, drawFace, drawMouthAndBeard } from './portraitFace.js';

const INK = '#140d0a';
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
  const ink = Math.abs(brightness(trim) - brightness(j)) > 0.4 ? trim : brightness(j) > 0.55 ? '#16110e' : '#ffffff';
  if (number != null) drawNumber(g, number, 26, ink, js);
}

// Sweatband across the forehead in the team's accent color.
function drawHeadband(g, L, head, team) {
  const [a, b] = head[9];
  g.row(9, a - 1, b + 1, team.accent);
  g.row(10, a - 1, b + 1, shade(team.accent, 0.8));
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
  const head = HEADS[looks.head] || HEADS.oval;
  drawFace(fg, looks, head);
  drawMouthAndBeard(fg, looks, head);
  drawHair(fg, looks, head);
  if (looks.headband) drawHeadband(fg, looks, head, team);
  if (looks.chain) drawChain(fg);
  outline(fg, bg, INK);
  fg.px.forEach((c, i) => { if (c) bg.px[i] = c; });
  const url = gridToUrl(bg);
  cache.set(key, url);
  return url;
}
