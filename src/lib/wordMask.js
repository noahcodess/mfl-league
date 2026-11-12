// Pixel grids for building fancy words: lay out a word from the 5x7 font as on/off cells (each font pixel = cw x ch cells),
// with slant, per-letter bounce and spacing, then grow, shift, round or cut the shape and paint it onto a canvas.
// The end zone fonts are built from these pieces.
import { G } from './pixelFont.js';

export const grid = (w, h) => ({ w, h, a: new Uint8Array(w * h) });
export const on = (g, x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h && g.a[y * g.w + x] === 1;
export const put = (g, x, y) => { if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.a[y * g.w + x] = 1; };
export const copy = (g) => ({ w: g.w, h: g.h, a: new Uint8Array(g.a) });
export const PAD = 6;

// opts: cw, ch (cells per font pixel), gap (cells between letters), slant (cells of lean per cell row), bounce (alternate letters
// move up and down this many cells), points (true: also return the font pixel centers per letter, for hand-drawn strokes).
export function wordMask(text, o = {}) {
  const cw = o.cw || 2, ch = o.ch || 2, gap = o.gap ?? cw, slant = o.slant || 0, bounce = o.bounce || 0;
  const chars = [...String(text).toUpperCase()];
  const adv = 5 * cw + gap, H = 7 * ch, lean = Math.ceil(H * slant);
  const g = grid(chars.length * adv - gap + lean + PAD * 2, H + bounce * 2 + PAD * 2);
  const pts = [];
  chars.forEach((c, i) => {
    const rows = G[c] || [], dy = bounce ? (i % 2 ? bounce * 2 : 0) : bounce, mine = [];
    for (let r = 0; r < 7; r++) for (let k = 0; k < 5; k++) {
      if (!((rows[r] >> (4 - k)) & 1)) continue;
      const x0 = PAD + i * adv + k * cw, y0 = PAD + dy + r * ch;
      mine.push([r, k, x0, y0]);
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) put(g, x0 + x + Math.round((H - (r * ch + y)) * slant), y0 + y);
    }
    pts.push(mine);
  });
  return o.points ? { g, pts, cw, ch, slant, H } : g;
}

export function grow(g, n = 1) {
  const out = copy(g);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (on(g, x, y)) for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) put(out, x + i, y + j);
  return out;
}

// Knocks off the outer corner cells so blocky letters look rounded.
export function roundCorners(g) {
  const out = copy(g);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (!on(g, x, y)) continue;
    const u = on(g, x, y - 1), d = on(g, x, y + 1), l = on(g, x - 1, y), r = on(g, x + 1, y);
    if ((!u && !l) || (!u && !r) || (!d && !l) || (!d && !r)) out.a[y * g.w + x] = 0;
  }
  return out;
}

export const edgeTop = (g, x, y) => on(g, x, y) && !on(g, x, y - 1);
export const edgeBottom = (g, x, y) => on(g, x, y) && !on(g, x, y + 1);
export const edgeLeft = (g, x, y) => on(g, x, y) && !on(g, x - 1, y);
export const edgeRight = (g, x, y) => on(g, x, y) && !on(g, x + 1, y);

// Paints every on cell (or every cell where colorAt returns a color) at an offset.
export function paint(ctx, g, color, dx = 0, dy = 0) {
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (!on(g, x, y)) continue;
    const c = typeof color === 'function' ? color(x, y) : color;
    if (c) { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, 1, 1); }
  }
}

export function canvasFor(g) { const c = document.createElement('canvas'); c.width = g.w + 4; c.height = g.h + 4; return c; }
