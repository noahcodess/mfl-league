// The front and back views of a player, built from his drip: front is the Drip tab art, back is the helmet shell and the
// number on his back. Each comes back as parts (body, both arms, both legs) so poses can move them. The side view is
// fieldSideArt.js.
import { uniformPixels, W, H } from './uniformDraw.js';
import { shade } from './pixels.js';

function grid() {
  const px = new Array(W * H).fill(null);
  const g = { px, set(x, y, c) { if (c && x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = c; }, get: (x, y) => px[y * W + x],
    row(y, a, b, c) { for (let x = a; x <= b; x++) g.set(x, y, c); }, rect(x, y, w, h, c) { for (let j = 0; j < h; j++) g.row(y + j, x, x + w - 1, c); } };
  return g;
}
const stripeOf = (C) => (C.stripe === C.helmet ? C.numbers : C.stripe);

// Splits a front or back drawing into parts by where they sit.
function split(src) {
  const parts = { body: grid(), armR: grid(), armL: grid(), legR: grid(), legL: grid() };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = src.get(x, y); if (!c) continue;
    const part = y >= 41 ? (x <= 15 ? 'legR' : 'legL') : y >= 31 && y <= 39 && x <= 6 ? 'armR' : y >= 31 && y <= 39 && x >= 25 ? 'armL' : 'body';
    parts[part].set(x, y, c);
  }
  return parts;
}

// The back: the face and mask become helmet shell (stripe running down it), no collar V, number stays on the back.
function backOf(src, look) {
  const C = look.colors, h = C.helmet, s = stripeOf(C), d = look.design || 'stripe';
  for (let y = 9; y <= 21; y++) {
    let a = -1, b = -1; for (let x = 0; x < W; x++) if (src.get(x, y)) { if (a < 0) a = x; b = x; }
    if (a < 0) continue;
    const c = y >= 20 ? shade(h, 0.62) : y >= 17 ? shade(h, 0.82) : h;
    for (let x = a; x <= b; x++) src.set(x, y, x === a ? shade(c, 1.2) : x === b ? shade(c, 0.7) : c);
    if (y <= 18) { if (d === 'stripe' || d === 'logo_stripe') { src.set(15, y, s); src.set(16, y, s); } if (d === 'double') { src.set(13, y, s); src.set(18, y, s); } }
  }
  src.row(20, 12, 19, shade(h, 0.55));
  src.row(22, 13, 18, shade(look.face.skin || '#c48a5f', 0.8));
  src.row(23, 12, 19, C.jersey); src.row(24, 13, 18, C.jersey); src.row(25, 14, 17, C.jersey); src.row(23, 13, 18, C.trim);
  return src;
}

// view: 'front' | 'back'. Returns { body, armR, armL, legR, legL } grids (32x56) before the build stretch.
export function viewParts(look, view) {
  const src = uniformPixels(look.colors, look.face, look.number, { drip: look.drip, design: look.design });
  return split(view === 'back' ? backOf(src, look) : src);
}
