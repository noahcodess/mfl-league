// Tiny pixel canvas helpers: a 32x32 grid you paint by coordinate, color shading, and a 3x5 digit font.
export const SIZE = 32;

export function makeGrid() {
  const px = new Array(SIZE * SIZE).fill(null);
  const g = {
    px,
    set(x, y, c) { if (c && x >= 0 && y >= 0 && x < SIZE && y < SIZE) px[y * SIZE + x] = c; },
    get(x, y) { return px[y * SIZE + x]; },
    row(y, x0, x1, c) { for (let x = x0; x <= x1; x++) g.set(x, y, c); },
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) g.row(y + j, x, x + w - 1, c); },
  };
  return g;
}

function toRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// f < 1 darkens, f > 1 lightens toward white.
export function shade(hex, f) {
  const [r, g, b] = toRgb(hex);
  return f < 1 ? toHex(r * f, g * f, b * f) : toHex(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1));
}

// Rough brightness 0-1, used to keep numbers readable on any jersey.
export function brightness(hex) {
  const [r, g, b] = toRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function mix(a, b, t) {
  const [r1, g1, b1] = toRgb(a), [r2, g2, b2] = toRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

const DIGITS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '011', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

// Draws a number centered on cx, top at y, with an optional 1px drop shadow.
export function drawNumber(g, num, cx, y, color, shadow) {
  const text = String(num);
  const left = Math.round(cx - (text.length * 4 - 1) / 2);
  const paint = (dx, dy, c) => [...text].forEach((ch, k) => DIGITS[ch].forEach((line, j) => [...line].forEach((bit, i) => {
    if (bit === '1') g.set(left + k * 4 + i + dx, y + j + dy, c);
  })));
  if (shadow) paint(1, 0, shadow);
  paint(0, 0, color);
}

// Paints the grid onto a canvas (one canvas pixel per grid pixel) and returns an image URL.
export function gridToUrl(g) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  g.px.forEach((c, i) => {
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(i % SIZE, Math.floor(i / SIZE), 1, 1);
  });
  return canvas.toDataURL();
}
