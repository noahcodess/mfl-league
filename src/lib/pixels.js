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

// Blocky 4x5 jersey digits.
const DIGITS = {
  0: ['1111', '1001', '1001', '1001', '1111'], 1: ['0110', '1110', '0110', '0110', '1111'], 2: ['1111', '0001', '1111', '1000', '1111'],
  3: ['1111', '0001', '0111', '0001', '1111'], 4: ['1001', '1001', '1111', '0001', '0001'], 5: ['1111', '1000', '1111', '0001', '1111'],
  6: ['1111', '1000', '1111', '1001', '1111'], 7: ['1111', '0001', '0011', '0010', '0010'], 8: ['1111', '1001', '1111', '1001', '1111'],
  9: ['1111', '1001', '1111', '0001', '1111'],
};

// Draws a jersey number centered on the 32-wide grid (top row y), with a 1px outline all the way around.
export function drawNumber(g, num, y, color, edge) {
  const text = String(num);
  const left = 16 - (text.length * 6 - 2) / 2;
  const cells = [];
  [...text].forEach((ch, k) => DIGITS[ch].forEach((line, j) => [...line].forEach((bit, i) => {
    if (bit === '1') cells.push([left + k * 6 + i, y + j]);
  })));
  if (edge) cells.forEach(([x, yy]) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) g.set(x + dx, yy + dy, edge); });
  cells.forEach(([x, yy]) => g.set(x, yy, color));
}

// Adds a dark 1px outline around everything painted on `fg` (the Hoopland look), drawn onto `out`.
export function outline(fg, out, color) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (fg.get(x, y)) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && fg.get(nx, ny);
      });
      if (near) out.set(x, y, color);
    }
  }
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
