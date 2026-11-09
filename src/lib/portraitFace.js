// Player faces for the pixel portraits: head shapes, eyes, brows, nose, mouth, facial hair and small extras.
import { shade, mix } from './pixels.js';

const INK = '#140d0a';

// Head shapes: row -> [left, right], all symmetric around the grid's center line (15.5).
function shapeRows(spec) {
  const rows = {};
  spec.forEach(([from, to, a, b]) => { for (let y = from; y <= to; y++) rows[y] = [a, b]; });
  return rows;
}
export const HEADS = {
  oval: shapeRows([[6, 6, 11, 20], [7, 7, 10, 21], [8, 18, 9, 22], [19, 19, 10, 21], [20, 20, 11, 20], [21, 21, 12, 19], [22, 22, 13, 18]]),
  wide: shapeRows([[6, 6, 10, 21], [7, 7, 9, 22], [8, 18, 8, 23], [19, 19, 9, 22], [20, 20, 10, 21], [21, 21, 11, 20], [22, 22, 13, 18]]),
  narrow: shapeRows([[6, 7, 11, 20], [8, 18, 10, 21], [19, 19, 11, 20], [20, 20, 12, 19], [21, 22, 13, 18]]),
  square: shapeRows([[6, 6, 11, 20], [7, 7, 10, 21], [8, 20, 9, 22], [21, 21, 10, 21], [22, 22, 12, 19]]),
  long: shapeRows([[5, 5, 11, 20], [6, 6, 10, 21], [7, 18, 9, 22], [19, 19, 10, 21], [20, 20, 11, 20], [21, 21, 12, 19], [22, 22, 13, 18]]),
};

function drawEyes(g, L, sh) {
  const [left, right] = L.eyeShape === 'close' ? [12, 17] : [11, 18];
  [left, right].forEach((l) => {
    const m = l + 1, r = l + 2;
    g.row(12, l, r, INK);
    if (L.eyeShape === 'narrow') { g.set(l, 13, sh); g.set(m, 13, shade(L.eyes, 0.8)); g.set(r, 13, sh); g.row(14, l, r, sh); return; }
    g.set(l, 13, '#f4efe8'); g.set(m, 13, shade(L.eyes, 0.85)); g.set(r, 13, '#f4efe8');
    if (L.eyeShape === 'wide') { g.set(l, 14, '#e6ded4'); g.set(m, 14, shade(L.eyes, 0.6)); g.set(r, 14, '#e6ded4'); g.row(15, l, r, sh); } else g.row(14, l, r, sh);
  });
  return [left, right];
}

function drawBrows(g, L, [left, right], sh2) {
  const c = L.style === 'bald' || L.style === 'buzz' ? sh2 : shade(L.hair, 0.75);
  [left, right].forEach((l, side) => {
    const outer = side === 0 ? l : l + 2, inner = side === 0 ? l + 2 : l;
    if (L.brows === 'thin') { g.row(11, Math.min(l + 1, inner), Math.max(l + 1, inner), c); return; }
    if (L.brows === 'angled') { g.set(outer, 10, c); g.set(l + 1, 11, c); g.set(inner, 11, c); g.set(outer, 11, c); return; }
    g.row(11, l, l + 2, c);
    if (L.brows === 'thick') g.row(10, l, l + 2, c);
  });
}

function drawNose(g, L, hi, sh, sh2) {
  if (L.nose === 'small') { g.set(15, 16, hi); g.set(16, 16, sh); g.set(15, 17, sh); return; }
  g.set(16, 14, sh); g.set(16, 15, sh); g.set(15, 16, hi); g.set(16, 16, sh);
  g.set(15, 17, sh2); g.set(17, 17, sh2);
  if (L.nose === 'big') { g.set(16, 13, sh); g.set(17, 16, sh); g.row(17, 14, 17, sh2); g.set(16, 17, sh); }
  if (L.nose === 'wide') { g.set(14, 17, sh2); g.set(18, 17, sh2); g.set(14, 16, sh); g.set(18, 16, sh); }
}

export function drawFace(g, L, head) {
  const sk = L.skin, hi = shade(sk, 1.15), sh = shade(sk, 0.82), sh2 = shade(sk, 0.66);
  for (let y = 20; y <= 22; y++) g.row(y, 13, 18, y <= 21 ? sh2 : sh);
  const [ea, eb] = head[13];
  g.rect(ea - 1, 12, 1, 4, sk); g.rect(ea - 1, 13, 1, 2, sh);
  g.rect(eb + 1, 12, 1, 4, sh); g.rect(eb + 1, 13, 1, 2, sh2);
  Object.entries(head).forEach(([y, [a, b]]) => {
    y = Number(y);
    g.row(y, a, b, sk);
    if (y >= 9) { g.set(b, y, sh); if (y >= 13) g.set(b - 1, y, sh); }
    if (y >= 8 && y <= 16) g.set(a + 1, y, hi);
  });
  g.row(7, 12, 15, hi);
  const chin = Math.max(...Object.keys(head).map(Number));
  g.row(chin - 1, head[chin - 1][0], head[chin - 1][1], sh); g.row(chin, head[chin][0], head[chin][1], sh);
  const eyes = drawEyes(g, L, sh);
  drawBrows(g, L, eyes, sh2);
  drawNose(g, L, hi, sh, sh2);
  if (L.freckles) [[11, 15], [13, 16], [19, 15], [20, 16], [12, 16]].forEach(([x, y]) => g.set(x, y, shade(sk, 0.78)));
  if (L.eyeBlack) { g.row(15, eyes[0], eyes[0] + 2, INK); g.row(15, eyes[1], eyes[1] + 2, INK); }
  if (L.earring) g.set(ea - 1, 16, '#f1c64a');
}

export function drawMouthAndBeard(g, L, head) {
  const lip = mix(L.skin, '#8c3b3b', 0.38), h = L.hair, hs = shade(h, 0.75), sh = shade(L.skin, 0.7);
  const jaw = (paint, from = 16) => {
    Object.entries(head).forEach(([y, [a, b]]) => {
      y = Number(y);
      if (y < from) return;
      for (let x = a; x <= b; x++) if (!(y < 19 && x > 12 && x < 19)) g.set(x, y, paint(x, y));
    });
  };
  if (L.beard === 'stubble') jaw((x, y) => mix(L.skin, h, (x * 2 + y) % 3 === 0 ? 0.5 : 0.28));
  if (L.beard === 'beard') jaw((x, y) => ((x * 3 + y) % 4 === 0 ? hs : h));
  if (L.beard === 'chinstrap') jaw((x, y) => (y >= 21 || x <= head[y][0] + 1 || x >= head[y][1] - 1 ? h : g.get(x, y)), 14);
  if (L.beard === 'goatee') for (let y = 20; y <= 22; y++) g.row(y, 14, 17, y % 2 ? h : hs);
  // Mouth shapes
  g.row(19, 14, 17, lip);
  if (L.mouth === 'smile') { g.set(13, 18, sh); g.set(18, 18, sh); g.row(19, 15, 16, '#f4efe8'); }
  else if (L.mouth === 'smirk') { g.set(18, 18, sh); g.set(13, 19, sh); }
  else if (L.mouth === 'frown') { g.set(13, 20, sh); g.set(18, 20, sh); }
  else { g.set(13, 19, sh); g.set(18, 19, sh); }
  if (L.beard !== 'beard') g.row(20, 15, 16, shade(L.skin, 0.8));
  if (['beard', 'goatee', 'mustache'].includes(L.beard)) g.row(18, 13, 18, h);
}
