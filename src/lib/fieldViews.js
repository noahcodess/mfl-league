// The three ways a player can face on the field, all built from his drip: front (the Drip tab art), back (helmet shell
// and the number on his back) and side (a profile with the facemask out front, the pants stripe down the leg). Each view
// comes back as parts (body, near/far arm, near/far leg) so poses can move them. Side views face right; flip for left.
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

// The side profile, facing right.
function side(look) {
  const C = look.colors, skin = look.face.skin || '#c48a5f', model = look.drip?.helmet || 'speedflex';
  const parts = { body: grid(), armR: grid(), armL: grid(), legR: grid(), legL: grid() }, B = parts.body;
  const h = C.helmet, hh = shade(h, 1.3), hs = shade(h, 0.68), j = C.jersey, js = shade(j, 0.72), jh = shade(j, 1.18);
  // helmet shell: round dome, flat-topped for the F7, low and long for the Axiom
  const shell = model === 'f7' ? [[2, 10, 21], ...Array.from({ length: 15 }, (_, i) => [3 + i, 9, 22])] : model === 'axiom' ? [[3, 11, 20], [4, 9, 22], ...Array.from({ length: 13 }, (_, i) => [5 + i, 8, 22])]
    : [[1, 12, 18], [2, 10, 20], [3, 9, 21], ...Array.from({ length: 12 }, (_, i) => [4 + i, 8, 22]), [16, 9, 22], [17, 10, 22]];
  shell.forEach(([y, a, b]) => { B.row(y, a, b, h); B.set(a, y, hs); if (y < 8) B.set(b, y, hh); });
  B.row(18, 9, 18, hs); B.row(19, 10, 16, hs);
  const s = stripeOf(C), d = look.design || 'stripe';
  if (d !== 'plain' && d !== 'logo') shell.slice(0, 3).forEach(([y, a, b]) => B.row(y, a + 1, b - 1, s));
  if (d === 'logo' || d === 'logo_stripe') B.rect(11, 8, 4, 3, C.numbers);
  B.rect(13, 12, 2, 2, '#141518');                                                   // ear hole
  for (let y = 9; y <= 17; y++) B.row(y, 19, 21, y === 11 ? '#1d1712' : shade(skin, y > 14 ? 0.85 : 1));   // his face behind the mask
  B.set(20, 11, '#f4f1ea');
  const m = C.mask; for (let y = 8; y <= 18; y++) { B.set(23, y, m); B.set(24, y, shade(m, 0.8)); } [10, 13, 16].forEach((y) => B.row(y, 20, 25, m)); B.row(18, 19, 24, shade(m, 0.75));
  B.rect(14, 19, 5, 3, shade(skin, 0.82));                                            // neck
  // pads and jersey, darker on his back side
  [[23, 11, 20], [24, 9, 22], [25, 8, 23], [26, 8, 23], [27, 8, 23], [28, 8, 23], [29, 8, 23], [30, 9, 22]].forEach(([y, a, b]) => { B.row(y, a, b, j); B.set(a, y, js); B.set(a + 1, y, js); B.set(b, y, jh); });
  B.row(24, 12, 18, jh);
  for (let y = 31; y <= 39; y++) { B.row(y, 10, 21, j); B.set(10, y, js); B.set(11, y, js); B.set(21, y, jh); }
  B.row(40, 10, 21, shade(C.pants, 0.72));
  // arms: near (armR) and far (armL, darker). Sleeve, skin, glove.
  const glove = ['both', 'right', 'left'].includes(look.drip?.gloves) ? (C[look.drip?.gloveColor] || look.drip?.gloveColor || C.trim) : skin;
  [['armR', 1], ['armL', 0.78]].forEach(([k, tone]) => {
    const A = parts[k];
    for (let y = 26; y <= 31; y++) { A.row(y, 14, 18, shade(j, tone * 0.9)); A.set(14, y, shade(j, tone * 0.7)); }
    A.row(29, 14, 18, shade(C.trim, tone));
    for (let y = 32; y <= 37; y++) A.row(y, 15, 18, shade(skin, tone));
    A.rect(15, 38, 4, 2, shade(glove || skin, tone));
  });
  // legs: thigh with the side stripe, knee, sock, cleat with the toe forward
  const p = C.pants, stripe = [C.trim, C.numbers, C.jersey].find((c) => c && c !== p) || '#1c1d21';
  [['legR', 1], ['legL', 0.8]].forEach(([k, tone]) => {
    const L = parts[k];
    for (let y = 41; y <= 48; y++) { L.row(y, 11, 19, shade(p, tone)); L.set(15, y, shade(stripe, tone)); L.set(16, y, shade(stripe, tone)); L.set(11, y, shade(p, tone * 0.78)); }
    L.row(47, 13, 19, shade(p, tone * 1.1));
    for (let y = 49; y <= 52; y++) L.row(y, 12, 18, shade(C.socks || j, tone));
    L.row(50, 12, 18, shade(C.trim, tone));
    L.row(53, 11, 20, '#17171a'); L.row(54, 11, 21, '#17171a'); L.row(55, 11, 21, '#3a3b40'); L.row(53, 16, 18, shade(C.trim, tone));
  });
  return parts;
}

// view: 'front' | 'back' | 'side'. Returns { body, armR, armL, legR, legL } grids (32x56) before the build stretch.
export function viewParts(look, view) {
  if (view === 'side') return side(look);
  const src = uniformPixels(look.colors, look.face, look.number, { drip: look.drip, design: look.design });
  return split(view === 'back' ? backOf(src, look) : src);
}
