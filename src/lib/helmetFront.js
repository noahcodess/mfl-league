// The helmet on the full-body uniform sprite (front view): the shell with each model's look, the team's helmet design, and the facemask.
// Models: Axiom (angular "spaceship" vents, wide bars), SpeedFlex (front flex panel, Riddell bumper), F7 (ridge lines, Schutt plate,
// cage mask), Vicis Zero2 (perforated dots, rounded chrome-style mask).
import { shade } from './pixels.js';

const INK = '#140d0a';
const RED = '#c8102e', PLATE = '#eef0f2';

export function drawHelmetFront(g, C, model = 'speedflex', design = 'stripe') {
  const h = C.helmet, hh = shade(h, 1.35), hs = shade(h, 0.68), vent = shade(h, 0.38);
  const stripe = C.stripe === h ? C.numbers : C.stripe;
  const shell = { 2: model === 'vicis' ? [12, 19] : [11, 20], 3: [9, 22], 4: [8, 23] };
  for (let y = 5; y <= 17; y++) shell[y] = [7, 24];
  shell[18] = [8, 23]; shell[19] = model === 'speedflex' ? [8, 23] : [9, 22];
  Object.entries(shell).forEach(([y, [a, b]]) => {
    y = Number(y);
    for (let x = a; x <= b; x++) if (!(y >= 11 && x >= 10 && x <= 21)) g.set(x, y, h);
    g.set(a, y, y < 11 ? hh : h); g.set(b, y, hs);
  });
  g.row(3, 11, 13, hh); g.row(4, 10, 12, hh); g.set(9, 5, hh);
  for (let y = 11; y <= 18; y++) { g.set(23, y, hs); g.set(24, y, shade(h, 0.55)); }
  g.row(10, 10, 21, hs);

  // team design
  if (design === 'stripe' || design === 'logo_stripe') for (let y = 2; y <= 9; y++) { g.set(15, y, stripe); g.set(16, y, stripe); }
  if (design === 'double') for (let y = 2; y <= 9; y++) { g.set(13, y, stripe); g.set(18, y, stripe); }
  if (design === 'logo' || design === 'logo_stripe') { g.rect(7, 12, 2, 3, C.numbers); g.rect(23, 12, 2, 3, shade(C.numbers, 0.85)); }
  g.set(8, 16, INK); g.set(23, 16, INK); // ear holes

  if (model === 'axiom') {
    [[10, 6], [11, 5], [12, 5], [13, 4]].forEach(([x, y]) => { g.set(x, y, vent); g.set(31 - x, y, vent); g.set(x, y - 1, hh); g.set(31 - x, y - 1, shade(h, 1.15)); });
    [[8, 9], [9, 8], [10, 8], [11, 7]].forEach(([x, y]) => { g.set(x, y, vent); g.set(31 - x, y, vent); });
    g.row(10, 12, 19, PLATE); g.row(10, 14, 17, RED);
  } else if (model === 'speedflex') {
    for (let y = 3; y <= 6; y++) { g.set(12, y, vent); g.set(19, y, vent); }
    g.row(7, 12, 19, vent); g.row(4, 13, 14, hh);
    g.row(10, 12, 19, PLATE); g.row(10, 14, 17, RED);
  } else if (model === 'f7') {
    for (let y = 3; y <= 9; y++) { g.set(11, y, vent); g.set(20, y, vent); g.set(12, y, y < 6 ? hh : h); }
    g.row(10, 12, 19, '#2a2b30'); g.row(10, 14, 17, '#cfd3d8');
  } else if (model === 'vicis') {
    [[9, 4], [11, 4], [10, 5], [12, 5], [9, 6], [11, 6], [10, 7], [12, 7], [11, 8]].forEach(([x, y]) => { g.set(x, y, vent); g.set(31 - x, y, vent); });
    g.row(10, 13, 18, PLATE); g.row(10, 14, 17, '#8a8f97');
  }
}

export function drawMaskFront(g, C, model = 'speedflex') {
  const m = C.mask, ms = shade(m, 0.72), mh = shade(m, 1.4);
  if (model === 'f7') {
    [14, 16, 18].forEach((y) => g.row(y, 9, 22, m));
    for (let y = 14; y <= 19; y++) { g.set(12, y, m); g.set(19, y, ms); g.set(15, y, m); g.set(16, y, ms); g.set(9, y, m); g.set(22, y, ms); }
  } else if (model === 'axiom') {
    g.row(15, 9, 22, m); g.row(16, 9, 22, ms); g.row(19, 11, 20, m);
    for (let y = 15; y <= 19; y++) { g.set(9, y, m); g.set(22, y, ms); g.set(15, y, m); g.set(16, y, ms); }
  } else if (model === 'vicis') {
    g.row(15, 10, 21, mh); g.row(18, 11, 20, m); g.set(9, 16, m); g.set(22, 16, ms); g.set(9, 17, m); g.set(22, 17, ms);
    for (let y = 15; y <= 19; y++) { g.set(14, y, m); g.set(17, y, ms); }
    g.set(12, 15, '#ffffff');
  } else {
    g.row(15, 9, 22, m); g.row(18, 10, 21, m);
    for (let y = 15; y <= 19; y++) { g.set(15, y, m); g.set(16, y, ms); }
    for (let y = 15; y <= 18; y++) { g.set(9, y, m); g.set(22, y, ms); }
  }
  g.set(10, 19, ms); g.set(21, 19, ms); g.set(11, 20, ms); g.set(20, 20, ms); // chin strap
  g.row(21, 13, 18, '#cfd2d8'); g.row(20, 14, 17, '#e6e8ec'); // chin cup
}
