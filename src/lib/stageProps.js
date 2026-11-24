// The ceremony stage's props in pixel art: a walnut lectern with a gold laurel-and-star emblem and a gooseneck mic, a lit
// glass trophy case (cups, a football trophy, a star) and the little trophies the nominees carry.
import { rect } from './stageHouse.js';

const G = ['#5a4116', '#8a6a2a', '#c79a3a', '#e9c368', '#fff0b0'];
export const LECTERN = { x: 204, top: 98, foot: 125 };
export const CASE = { x: 87, y: 78, w: 30, h: 46 };

// A gold cup. (x, y): the bottom middle of its base. s: 1 small (held), 2 big (raised by a winner).
export function drawCup(ctx, x, y, s = 1) {
  const r = (a, b, w, h, c) => rect(ctx, c, x + a * s, y + b * s, w * s, h * s);
  r(-3, -2, 6, 2, G[0]); r(-2, -3, 4, 1, G[2]); r(-1, -5, 2, 2, G[2]);   // base, collar, stem
  r(-3, -10, 6, 5, G[2]); r(-4, -12, 8, 2, G[3]); r(-3, -10, 1, 4, G[4]); r(2, -10, 1, 4, G[1]);   // bowl and lip
  r(-5, -11, 1, 3, G[1]); r(4, -11, 1, 3, G[1]); r(-4, -8, 1, 1, G[1]); r(3, -8, 1, 1, G[1]);   // handles
  r(-1, -9, 2, 2, G[4]);   // shine
}
function ballTrophy(ctx, x, y) {   // a football on a pedestal
  rect(ctx, '#2a1408', x - 4, y - 3, 8, 3); rect(ctx, G[2], x - 4, y - 4, 8, 1); rect(ctx, G[2], x - 1, y - 8, 2, 4);
  rect(ctx, '#7a3a14', x - 4, y - 12, 8, 4); rect(ctx, '#5a2a0e', x - 3, y - 13, 6, 1); rect(ctx, '#5a2a0e', x - 3, y - 8, 6, 1);
  rect(ctx, '#f2e6d0', x - 1, y - 11, 3, 1); rect(ctx, '#f2e6d0', x - 1, y - 10, 1, 1); rect(ctx, '#f2e6d0', x + 1, y - 10, 1, 1);
}
function starTrophy(ctx, x, y) {
  rect(ctx, G[0], x - 3, y - 2, 6, 2); rect(ctx, G[2], x - 1, y - 6, 2, 4);
  for (const [a, b] of [[0, -12], [-1, -11], [0, -11], [1, -11], [-4, -10], [-3, -10], [-2, -10], [-1, -10], [0, -10], [1, -10], [2, -10], [3, -10], [4, -10],
    [-2, -9], [-1, -9], [0, -9], [1, -9], [2, -9], [-2, -8], [-1, -8], [1, -8], [2, -8], [-3, -7], [3, -7]]) rect(ctx, a < 0 ? G[3] : G[2], x + a, y + b, 1, 1);
  rect(ctx, G[4], x, y - 10, 1, 1);
}

export function drawTrophyCase(ctx) {
  const { x, y, w, h } = CASE;
  rect(ctx, '#1c0e06', x - 1, y - 1, w + 2, h + 2);
  for (let j = 0; j < h; j++) { const k = j / h; rect(ctx, `rgb(${Math.round(46 - 26 * k)},${Math.round(16 - 8 * k)},${Math.round(30 - 14 * k)})`, x + 2, y + 2 + j, w - 4, 1); }   // velvet, lit from the top
  rect(ctx, '#4a2612', x, y, 2, h); rect(ctx, '#2e170a', x + w - 2, y, 2, h); rect(ctx, '#3a1f0e', x, y + h - 3, w, 3);   // walnut frame
  rect(ctx, G[2], x - 2, y - 4, w + 4, 2); rect(ctx, G[4], x - 2, y - 4, w + 4, 1); rect(ctx, G[1], x - 1, y - 2, w + 2, 2);   // gold crown
  for (const fx of [x - 1, x + w / 2 - 1, x + w - 1]) { rect(ctx, G[3], fx, y - 7, 2, 3); rect(ctx, G[4], fx, y - 8, 1, 1); }   // finials
  const shelves = [y + 15, y + 29, y + 42];
  for (const sy of shelves) { rect(ctx, '#a8c4d855', x + 2, sy, w - 4, 1); rect(ctx, G[1], x + 2, sy + 1, w - 4, 1); }
  drawCup(ctx, x + w / 2, shelves[0], 1); drawCup(ctx, x + 7, shelves[0], 1); drawCup(ctx, x + w - 7, shelves[0], 1);   // the champions' cups
  ballTrophy(ctx, x + 10, shelves[1]); starTrophy(ctx, x + w - 10, shelves[1]);
  rect(ctx, '#2a1408', x + 6, shelves[2] - 8, 9, 8); rect(ctx, G[2], x + 7, shelves[2] - 7, 7, 5); rect(ctx, G[4], x + 7, shelves[2] - 7, 7, 1);   // a plaque
  drawCup(ctx, x + w - 10, shelves[2], 1);
  for (let i = 0; i < 9; i++) { rect(ctx, '#ffffff26', x + 5 + i, y + 4 + i * 2, 1, 2); rect(ctx, '#ffffff14', x + 14 + i, y + 6 + i * 2, 1, 2); }   // glass glints
  rect(ctx, '#ffffff30', x + 2, y + 2, w - 4, 1);
}

export function drawLectern(ctx) {
  const { x, top, foot } = LECTERN, w = 26;
  rect(ctx, '#00000055', x - 3, foot - 1, w + 6, 2);   // its shadow on the floor
  for (let y = top + 4; y < foot - 3; y++) {
    const inset = Math.round((y - top - 4) * 0.1);
    rect(ctx, '#4a2612', x + inset, y, w - inset * 2, 1);
    rect(ctx, '#6b3a1c', x + inset, y, 2, 1); rect(ctx, '#2a1408', x + w - inset - 3, y, 3, 1);   // lit left edge, dark right
    if ((y + x) % 5 === 0) rect(ctx, '#552c15', x + inset + 4, y, w - inset * 2 - 8, 1);   // grain
  }
  rect(ctx, '#3a1f0e', x - 2, top + 1, w + 4, 3); rect(ctx, '#6b3a1c', x - 2, top, w + 4, 1); rect(ctx, G[3], x - 2, top + 3, w + 4, 1);   // the slanted top
  const px = x + 5, py = top + 7;   // the front panel: velvet in a gold frame, a laurel around a star
  rect(ctx, G[1], px, py, 16, 14); rect(ctx, '#3a0a14', px + 1, py + 1, 14, 12);
  for (const [a, b] of [[7, 3], [6, 4], [7, 4], [8, 4], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [5, 7], [6, 7], [8, 7], [9, 7], [4, 8], [10, 8]])
    rect(ctx, a <= 7 ? G[4] : G[3], px + a, py + b, 1, 1);
  for (let i = 0; i < 5; i++) { rect(ctx, G[2], px + 2 + Math.round(i * 0.3), py + 10 - i * 2, 1, 1); rect(ctx, G[3], px + 3 + Math.round(i * 0.3), py + 10 - i * 2, 1, 1);
    rect(ctx, G[2], px + 13 - Math.round(i * 0.3), py + 10 - i * 2, 1, 1); rect(ctx, G[3], px + 12 - Math.round(i * 0.3), py + 10 - i * 2, 1, 1); }
  rect(ctx, G[2], px + 6, py + 11, 4, 1);   // the laurel's tie
  rect(ctx, G[2], x - 1, foot - 3, w + 2, 1); rect(ctx, '#2a1408', x - 1, foot - 2, w + 2, 2);   // plinth
  rect(ctx, '#1a1a1e', x + 16, top - 7, 1, 7); rect(ctx, '#1a1a1e', x + 15, top - 9, 1, 2); rect(ctx, '#1a1a1e', x + 13, top - 10, 2, 1);   // gooseneck mic
  rect(ctx, '#3a3a42', x + 11, top - 11, 3, 2); rect(ctx, '#ff3344', x + 14, top - 10, 1, 1);
  rect(ctx, G[1], x + 4, top - 3, 1, 3); rect(ctx, G[2], x + 3, top - 1, 3, 1);   // a brass banker's lamp with a green glass shade
  rect(ctx, '#1f6b4a', x + 1, top - 5, 7, 2); rect(ctx, '#3fa06e', x + 1, top - 5, 7, 1); rect(ctx, '#ffe9a8', x + 2, top - 3, 5, 1);
}
