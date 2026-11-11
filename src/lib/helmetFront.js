// The helmet on the full-body uniform sprite (front view). Three models with real-life silhouettes:
//   Axiom (Riddell): low, wide, sleek shell with big black stealth vents, thick integrated mask with a wide eye port.
//   SpeedFlex (Riddell): tall round dome, the U-shaped flex panel up front, jaw flaps that flare out, thin S-shaped bars.
//   F7 (Schutt): boxy flat-topped shell, raised ridges front to back, big plate above the mask, side buckles, cage mask.
import { shade } from './pixels.js';

const INK = '#140d0a', RED = '#c8102e', PLATE = '#eef0f2', SILVER = '#cfd3d8';

const SHAPES = {
  axiom: { 3: [10, 21], 4: [8, 23], 5: [7, 24], ...rows(6, 16, 6, 25), 17: [6, 25], 18: [7, 24], 19: [8, 23] },
  speedflex: { 1: [12, 19], 2: [10, 21], 3: [9, 22], 4: [8, 23], ...rows(5, 15, 7, 24), 16: [6, 25], 17: [5, 26], 18: [5, 26], 19: [6, 25] },
  f7: { 2: [9, 22], ...rows(3, 18, 7, 24), 19: [8, 23] },
};
function rows(a, b, l, r) { const o = {}; for (let y = a; y <= b; y++) o[y] = [l, r]; return o; }

export function drawHelmetFront(g, C, model = 'speedflex', design = 'stripe') {
  const shape = SHAPES[model] || SHAPES.speedflex;
  const h = C.helmet, hh = shade(h, 1.35), hs = shade(h, 0.68), vent = '#141518';
  const stripe = C.stripe === h ? C.numbers : C.stripe;
  const top = Math.min(...Object.keys(shape).map(Number));
  Object.entries(shape).forEach(([y, [a, b]]) => {
    y = Number(y);
    for (let x = a; x <= b; x++) if (!(y >= 11 && x >= 10 && x <= 21)) g.set(x, y, h);
    g.set(a, y, y < 11 ? hh : h); g.set(b, y, hs);
  });
  for (let y = 11; y <= 18; y++) { const [, b] = shape[y]; g.set(b - 1, y, hs); g.set(b, y, shade(h, 0.55)); }
  g.row(10, 10, 21, hs);

  if (design === 'stripe' || design === 'logo_stripe') for (let y = top; y <= 9; y++) { g.set(15, y, stripe); g.set(16, y, stripe); }
  if (design === 'double') for (let y = top; y <= 9; y++) { g.set(13, y, stripe); g.set(18, y, stripe); }
  const side = model === 'axiom' ? [6, 24] : model === 'speedflex' ? [7, 23] : [7, 23];
  if (design === 'logo' || design === 'logo_stripe') { g.rect(side[0], 12, 2, 3, C.numbers); g.rect(side[1], 12, 2, 3, shade(C.numbers, 0.85)); }

  if (model === 'axiom') {
    g.row(top, 12, 19, hh); g.row(top + 1, 10, 13, hh);
    // stealth vents: two big black blades sweeping back from the brow
    [[9, 8], [10, 7], [11, 6], [12, 5], [13, 4]].forEach(([x, y]) => { g.set(x, y, vent); g.set(x + 1, y, vent); g.set(31 - x, y, vent); g.set(30 - x, y, vent); });
    g.set(15, 6, vent); g.set(16, 6, vent); g.set(15, 7, vent); g.set(16, 7, vent);
    g.row(10, 11, 20, PLATE); g.row(10, 14, 17, RED);
  } else if (model === 'speedflex') {
    g.row(2, 11, 13, hh); g.row(3, 10, 11, hh);
    // the flex panel: a raised U cut into the forehead
    for (let y = 2; y <= 8; y++) { g.set(11, y, vent); g.set(20, y, vent); }
    g.row(9, 11, 20, vent);
    for (let y = 3; y <= 8; y++) { g.set(12, y, hh); }
    g.row(10, 12, 19, PLATE); g.row(10, 14, 17, RED);
    g.set(5, 17, SILVER); g.set(26, 17, SILVER); // jaw clips
  } else {
    // boxy shell with raised ridges and the Schutt plate
    for (let y = 2; y <= 8; y++) { g.set(10, y, hh); g.set(11, y, hs); g.set(20, y, hh); g.set(21, y, hs); }
    if (design !== 'stripe' && design !== 'logo_stripe') for (let y = 2; y <= 8; y++) { g.set(15, y, hh); g.set(16, y, hs); }
    g.rect(11, 9, 10, 2, '#2a2b30'); g.row(9, 13, 18, SILVER); g.set(15, 10, '#ffffff');
    g.rect(7, 6, 1, 2, SILVER); g.rect(24, 6, 1, 2, SILVER); // strap buckles
  }
  g.set(model === 'speedflex' ? 7 : 8, 15, INK); g.set(model === 'speedflex' ? 24 : 23, 15, INK); // ear holes
}

export function drawMaskFront(g, C, model = 'speedflex') {
  const m = C.mask, ms = shade(m, 0.72);
  if (model === 'f7') {
    [14, 16, 18].forEach((y) => g.row(y, 9, 22, m));
    [9, 11, 13, 15].forEach((x) => { for (let y = 14; y <= 19; y++) { g.set(x, y, m); g.set(31 - x, y, ms); } });
  } else if (model === 'axiom') {
    g.row(15, 8, 23, m); g.row(16, 8, 23, ms); g.row(19, 11, 20, m); g.row(20, 12, 19, ms);
    for (let y = 15; y <= 20; y++) { g.set(8, y, m); g.set(9, y, ms); g.set(22, y, m); g.set(23, y, ms); g.set(15, y, m); g.set(16, y, ms); }
  } else {
    g.row(15, 9, 22, m); g.row(18, 10, 21, m);
    for (let y = 15; y <= 19; y++) { g.set(15, y, m); g.set(16, y, ms); }
    g.set(8, 14, m); g.set(9, 15, m); g.set(8, 16, m); g.set(9, 17, m); g.set(23, 14, ms); g.set(22, 15, ms); g.set(23, 16, ms); g.set(22, 17, ms); // S-curve sides
  }
  g.set(10, 19, ms); g.set(21, 19, ms); g.set(11, 20, ms); g.set(20, 20, ms); // chin strap
  g.row(21, 13, 18, '#cfd2d8'); g.row(20, 14, 17, '#e6e8ec'); // chin cup
}
