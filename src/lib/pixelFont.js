// A 5x7 pixel font (A-Z, 0-9) for painting words on the field: end zone names, yard numbers, wall boards.
// put(x, y, w, h) paints one block. dir: 'right' (normal), 'flip' (upside-down), 'up' (reads bottom to top, letter tops
// point left) and 'down' (reads top to bottom, letter tops point right) for the two end zones.
const G = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2],
  5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  "'": [4, 4, 8, 0, 0, 0, 0], '-': [0, 0, 0, 14, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4],
};

// How long a word is along its reading direction, in pixels.
export const textLength = (text, s = 1) => text.length * 6 * s - s;

export function drawPixelText(put, text, x, y, s = 1, dir = 'right') {
  const str = String(text).toUpperCase(), L = textLength(str, s);
  [...str].forEach((ch, i) => {
    const rows = G[ch];
    if (!rows) return;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      if (!((rows[r] >> (4 - c)) & 1)) continue;
      const u = i * 6 * s + c * s, v = r * s; // u: along the word, v: down from the letter tops
      if (dir === 'right') put(x + u, y + v, s, s);
      else if (dir === 'flip') put(x + L - s - u, y + 6 * s - v, s, s);
      else if (dir === 'up') put(x + v, y - u - s, s, s);
      else put(x - v - s, y + u, s, s);
    }
  });
}
