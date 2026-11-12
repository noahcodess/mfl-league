// The end zone fonts. Each one turns a word into a small pixel picture (1 cell = 1 pixel) that the end zone scales up and turns
// sideways. Everyone: Block, Bold, Tall, Italic, Outline, 3D, Scribble (handwriting). Team-only: Golem (Flower Forest Golems:
// iron blocks with moss), Future (End City Blazes: wide, fast, glowing), Creeper Bold (Snowy Mountain Creepers: big, heavy, slightly rounded).
import { shade } from './pixels.js';
import { rng } from './fieldLayout.js';
import { wordMask, grow, roundCorners, paint, canvasFor, on, put, grid, edgeTop, edgeBottom, edgeLeft, edgeRight, PAD } from './wordMask.js';

export const FONTS = [
  ['block', 'Block'], ['bold', 'Bold'], ['tall', 'Tall'], ['italic', 'Italic'], ['outline', 'Outline'], ['3d', '3D'], ['scribble', 'Scribble'],
  ['golem', 'Golem', 'flf'], ['future', 'Future', 'edc'], ['cartoon', 'Creeper Bold', 'snm'],
];
export const fontsFor = (teamId) => FONTS.filter(([, , only]) => !only || only === teamId);

function simple(m, c, shadow = 2) {
  const cv = canvasFor(m), x = cv.getContext('2d');
  paint(x, m, c.edge, shadow, shadow); paint(x, m, c.ink);
  return cv;
}

function scribble(text, c) {
  const { g, pts, cw, ch } = wordMask(text, { cw: 4, ch: 4, gap: 4, slant: 0.22, points: true });
  const pen = grid(g.w, g.h), r = rng(text.length * 97 + 13);
  pts.forEach((letter) => {
    const bob = Math.round((r() - 0.5) * 4), at = new Map();
    letter.forEach(([row, col, x0, y0]) => at.set(`${row},${col}`, [x0 + 1 + Math.round((r() - 0.5) * 2) + Math.round((7 - row) * ch * 0.22), y0 + 1 + bob + Math.round((r() - 0.5) * 2)]));
    letter.forEach(([row, col]) => {
      const [ax, ay] = at.get(`${row},${col}`);
      let linked = false;
      [[0, 1], [1, 0], [1, 1], [1, -1]].forEach(([dr, dc]) => {
        const b = at.get(`${row + dr},${col + dc}`); if (!b) return;
        linked = true; const n = Math.max(Math.abs(b[0] - ax), Math.abs(b[1] - ay)) || 1;
        for (let i = 0; i <= n; i++) { const px = Math.round(ax + (b[0] - ax) * i / n), py = Math.round(ay + (b[1] - ay) * i / n); put(pen, px, py); put(pen, px + 1, py); put(pen, px, py + 1); }
      });
      if (!linked) { put(pen, ax, ay); put(pen, ax + 1, ay); put(pen, ax, ay + 1); put(pen, ax + 1, ay + 1); }
    });
  });
  return simple(pen, c, 2);
}

function golem(text) {
  const body = wordMask(text, { cw: 3, ch: 4, gap: 3 }), out = grow(body, 1), cv = canvasFor(out), x = cv.getContext('2d'), r = rng(41);
  paint(x, out, '#24261f', 2, 2); paint(x, out, '#2f322a');
  const tex = ['#d6d0c4', '#cbc4b6', '#dfd9cd', '#d6d0c4'];
  paint(x, body, (i, j) => (edgeTop(body, i, j) || edgeLeft(body, i, j) ? '#f4f1ea' : edgeBottom(body, i, j) || edgeRight(body, i, j) ? '#958e81' : tex[Math.floor(r() * 4)]));
  for (let k = 0; k < body.w / 7; k++) { let i = Math.floor(r() * body.w), j = Math.floor(r() * body.h); for (let n = 0; n < 4; n++, i++, j++) if (on(body, i, j)) { x.fillStyle = '#7f786c'; x.fillRect(i, j, 1, 1); } } // cracks
  for (let i = 0; i < body.w; i++) for (let j = 0; j < body.h; j++) if (edgeTop(body, i, j) && r() < 0.16) { const len = 1 + Math.floor(r() * 5); for (let n = 0; n < len && on(body, i, j + n); n++) { x.fillStyle = n % 2 ? '#4f8a2c' : '#6aa83a'; x.fillRect(i, j + n, 1, 1); } } // moss and vines
  return cv;
}

// The team color pushed to full brightness (dark purple becomes hot magenta).
const neon = (hex) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255], k = 255 / Math.max(1, ...c); return '#' + c.map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join(''); };

function future(text, c, team) {
  const m = wordMask(text, { cw: 3, ch: 2, gap: 2, slant: 0.7 }), slit = PAD + 8;
  for (let i = 0; i < m.w; i++) m.a[slit * m.w + i] = 0; // the speed cut through every letter
  const hot = neon(team.color), cv = canvasFor(m), x = cv.getContext('2d');
  for (let j = PAD + 1; j < m.h - PAD; j += 3) { let first = -1; for (let i = 0; i < m.w; i++) if (on(m, i, j)) { first = i; break; } if (first > 4) { x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(0, j, first - 3, 1); } } // motion streaks
  x.globalAlpha = 0.3; paint(x, grow(m, 2), hot); x.globalAlpha = 1; // glow
  paint(x, grow(m, 1), shade(team.color, 0.45));
  paint(x, m, c.ink, 1, 1); // gold under-edge
  paint(x, m, (i, j) => (edgeTop(m, i, j) ? shade(hot, 1.55) : hot));
  return cv;
}

function cartoon(text, c) { // Creepers: plain heavy letters with softened corners, nothing else
  const body = roundCorners(grow(wordMask(text, { cw: 3, ch: 3, gap: 5 }), 1));
  return simple(body, c, 3);
}

// c: { ink, edge, base } colors. Returns a canvas with the word drawn left to right.
export function renderWord(font, text, c, team) {
  if (font === 'scribble') return scribble(text, c);
  if (font === 'golem') return golem(text);
  if (font === 'future') return future(text, c, team);
  if (font === 'cartoon') return cartoon(text, c);
  if (font === 'bold') return simple(grow(wordMask(text, { gap: 4 }), 1), c, 3);
  if (font === 'tall') return simple(wordMask(text, { ch: 3 }), c);
  if (font === 'italic') return simple(wordMask(text, { slant: 0.35 }), c);
  if (font === 'outline') { const m = wordMask(text), o = grow(m, 1), cv = canvasFor(o), x = cv.getContext('2d'); paint(x, o, c.ink); paint(x, m, c.base); return cv; }
  if (font === '3d') { const m = wordMask(text), cv = canvasFor(m), x = cv.getContext('2d'); for (let k = 4; k >= 1; k--) paint(x, m, shade(c.base, 0.32 + k * 0.05), k, k); paint(x, m, (i, j) => (edgeTop(m, i, j) ? shade(c.ink, 1.15) : c.ink)); return cv; }
  return simple(wordMask(text), c);
}
