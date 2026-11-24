// The ceremony stage's props in pixel art (half-unit detail): a walnut lectern with a laurel-and-star panel, a gooseneck
// mic and a green banker's lamp; a black marble pedestal with gold bands holding the big trophy; and the gold cups the
// nominees carry and the winner raises.
import { rect } from './stageHouse.js';

const G = ['#5a4116', '#8a6a2a', '#c79a3a', '#e9c368', '#fff0b0'];
export const LECTERN = { x: 207, top: 108, foot: 125, w: 14 };
export const PLINTH = { x: 106, top: 107, foot: 125 };

// A gold cup. (x, y): the bottom middle of its base. s: 1 = 10 units tall (the pedestal's), 0.5 held, 0.75 raised.
export function drawCup(ctx, x, y, s = 1) {
  const r = (a, b, w, h, c) => rect(ctx, c, x + a * s, y + b * s, w * s, h * s);
  r(-3.5, -1.5, 7, 1.5, G[0]); r(-3, -2, 6, 0.5, G[2]); r(-2.5, -3, 5, 1, '#2a1408'); r(-2.5, -3, 5, 0.5, G[1]);   // base with a dark band
  r(-1, -5, 2, 2, G[2]); r(-1, -5, 0.5, 2, G[4]); r(-1.5, -5.5, 3, 0.5, G[3]);   // stem
  for (let j = 0; j < 5; j += 0.5) { const half = 4 - Math.max(0, j - 2.5) * 0.9; r(-half, -10.5 + j, half * 2, 0.5, G[2]); r(-half, -10.5 + j, 1, 0.5, G[4]); r(half - 1, -10.5 + j, 1, 0.5, G[1]); }   // the bowl
  r(-4.5, -11, 9, 1, G[3]); r(-4.5, -11, 9, 0.5, G[4]);   // lip
  r(-6, -10, 1, 3, G[2]); r(-5.5, -10.5, 1, 0.5, G[3]); r(-5.5, -7, 1.5, 0.5, G[1]);   // handles
  r(5, -10, 1, 3, G[1]); r(4.5, -10.5, 1, 0.5, G[3]); r(4, -7, 1.5, 0.5, G[1]);
  r(-1.5, -9.5, 1, 2.5, '#fffbe6');   // shine
}

export function drawPlinth(ctx) {
  const { x, top, foot } = PLINTH;
  rect(ctx, '#00000066', x - 7, foot - 0.5, 14, 1.5);   // shadow
  rect(ctx, '#0e0c12', x - 5, top + 2, 10, foot - top - 4);   // black marble column
  for (let y = top + 2; y < foot - 2; y += 0.5) { rect(ctx, '#2a2632', x - 5, y, 1, 0.5); rect(ctx, '#050408', x + 4, y, 1, 0.5); if ((y * 7) % 5 < 0.6) rect(ctx, '#3a3444', x - 3 + ((y * 3) % 5), y, 1.5, 0.5); }   // veins
  for (const by of [top + 1, foot - 3]) { rect(ctx, G[2], x - 6, by, 12, 1.5); rect(ctx, G[4], x - 6, by, 12, 0.5); rect(ctx, G[0], x - 6, by + 1.5, 12, 0.5); }   // gold bands
  rect(ctx, '#18141e', x - 6.5, foot - 1.5, 13, 1.5);
  drawCup(ctx, x, top + 1, 1);
}

export function drawLectern(ctx) {
  const { x, top, foot, w } = LECTERN;
  rect(ctx, '#00000066', x - 2, foot - 0.5, w + 4, 1.5);
  for (let y = top + 2; y < foot - 1.5; y += 0.5) {   // the body: walnut, lit from the left, with grain
    const inset = Math.round((y - top - 2) * 0.08 * 2) / 2;
    rect(ctx, '#4a2612', x + inset, y, w - inset * 2, 0.5);
    rect(ctx, '#7a4422', x + inset, y, 1, 0.5); rect(ctx, '#2a1408', x + w - inset - 1.5, y, 1.5, 0.5);
    if ((y * 4 + x) % 5 === 0) rect(ctx, '#5a3018', x + inset + 2, y, w - inset * 2 - 4, 0.5);
  }
  rect(ctx, '#3a1f0e', x - 1, top + 0.5, w + 2, 1.5); rect(ctx, '#8a5028', x - 1, top, w + 2, 0.5); rect(ctx, G[3], x - 1, top + 2, w + 2, 0.5);   // the slanted top
  const px = x + 3, py = top + 4;   // front panel: velvet in a gold frame, a star inside a laurel
  rect(ctx, G[2], px, py, 8, 8); rect(ctx, '#3a0a14', px + 0.5, py + 0.5, 7, 7);
  for (const [a, b] of [[3.5, 1.5], [3, 2], [3.5, 2], [4, 2], [2, 2.5], [2.5, 2.5], [3, 2.5], [3.5, 2.5], [4, 2.5], [4.5, 2.5], [5, 2.5], [2.5, 3], [3, 3], [3.5, 3], [4, 3], [4.5, 3], [2.5, 3.5], [3, 3.5], [4, 3.5], [4.5, 3.5], [2, 4], [5, 4]])
    rect(ctx, a <= 3.5 ? G[4] : G[3], px + a, py + b, 0.5, 0.5);
  for (let i = 0; i < 5; i++) { rect(ctx, G[2], px + 1 + i * 0.15, py + 5.5 - i * 0.8, 0.5, 0.5); rect(ctx, G[2], px + 6.5 - i * 0.15, py + 5.5 - i * 0.8, 0.5, 0.5); }
  rect(ctx, G[3], px + 3, py + 6, 2, 0.5);
  rect(ctx, G[2], x - 0.5, foot - 2, w + 1, 0.5); rect(ctx, '#2a1408', x - 0.5, foot - 1.5, w + 1, 1.5);   // plinth
  rect(ctx, '#1a1a1e', x + 10, top - 4, 0.5, 4); rect(ctx, '#1a1a1e', x + 9.5, top - 5, 0.5, 1); rect(ctx, '#1a1a1e', x + 8.5, top - 5.5, 1, 0.5);   // gooseneck mic
  rect(ctx, '#3a3a42', x + 7, top - 6, 2, 1); rect(ctx, '#5a5a66', x + 7, top - 6, 2, 0.5); rect(ctx, '#ff3344', x + 9, top - 5.5, 0.5, 0.5);
  rect(ctx, G[1], x + 2.5, top - 2, 0.5, 2); rect(ctx, G[2], x + 2, top - 0.5, 1.5, 0.5);   // banker's lamp
  rect(ctx, '#1f6b4a', x + 0.5, top - 3, 4.5, 1); rect(ctx, '#4fb07e', x + 0.5, top - 3, 4.5, 0.5); rect(ctx, '#ffe9a8', x + 1, top - 2, 3.5, 0.5);
}
