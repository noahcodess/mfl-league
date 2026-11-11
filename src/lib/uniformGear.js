// Drip on the full-body uniform sprite: undershirt (peeking out or long sleeve), arm sleeves (one or both, solid/stripe/two-tone),
// gloves (one or both), the QB play sheet, classic or short pants, compression shorts, leg sleeves, socks and cleats.
// The player's right side is on the left of the picture.
import { shade } from './pixels.js';

const INK = '#140d0a', CLEAT = '#17171a';
export const DEFAULT_DRIP = { helmet: 'speedflex', undershirt: 'none', sleeves: 'none', sleeveStyle: 'solid', gloves: 'both', gloveColor: 'trim', playsheet: false, pants: 'classic', compression: 'none', legSleeves: 'none' };

// Turns a drip color (team token or hex) into a hex for this uniform.
export function dripColor(token, C, fallback) {
  if (!token || token === 'none') return fallback;
  return { jersey: C.jersey, trim: C.trim, numbers: C.numbers, white: '#f1f3f5', black: '#1c1d21' }[token] || token;
}
const on = (side, which) => side === 'both' || side === which;

export function drawArms(g, C, skin, d) {
  const sides = [['right', 3, 6, 1], ['left', 25, 28, 0.86]];
  sides.forEach(([side, a, b, tone]) => {
    for (let y = 31; y <= 37; y++) { g.row(y, a, b, shade(skin, tone)); g.set(side === 'right' ? b : a, y, shade(skin, tone * 0.9)); }
    if (d.undershirt !== 'none') {
      const u = shade(dripColor(d.undershirtColor, C, '#1c1d21'), tone);
      for (let y = 31; y <= (d.undershirt === 'long' ? 37 : 32); y++) g.row(y, a, b, u);
    }
    if (on(d.sleeves, side)) {
      const s1 = shade(dripColor(d.sleeveColor, C, '#1c1d21'), tone), s2 = shade(dripColor(d.sleeveColor2, C, '#f1f3f5'), tone);
      for (let y = 33; y <= 37; y++) g.row(y, a, b, d.sleeveStyle === 'two_tone' && y >= 35 ? s2 : s1);
      if (d.sleeveStyle === 'stripe') g.row(35, a, b, s2);
    }
    if (d.playsheet && side === 'left') { g.rect(a, 33, 4, 3, '#f4f4f0'); g.row(34, a + 1, b - 1, '#5a6270'); g.set(a, 33, '#cfd2d8'); }
    const glove = on(d.gloves, side) ? shade(dripColor(d.gloveColor, C, C.trim), tone) : shade(skin, tone);
    g.rect(a, 38, 4, 2, glove);
    if (on(d.gloves, side)) g.set(side === 'right' ? a : b, 39, shade(glove, 0.8));
  });
}

export function drawLegs(g, C, skin, d, stripeColor) {
  const p = C.pants, ph = shade(p, 1.18), ps = shade(p, 0.74);
  const short = d.pants === 'short';
  const end = short ? 44 : 48;
  g.row(40, 8, 23, ps); g.set(15, 40, shade(p, 0.55)); g.set(16, 40, shade(p, 0.55)); // belt line
  for (let y = 41; y <= end; y++) {
    g.row(y, 8, 15, p); g.row(y, 16, 23, p);
    g.set(8, y, ph); g.set(23, y, ps);
    g.set(9, y, stripeColor); g.set(22, y, shade(stripeColor, 0.88));
    if (y >= 44) { g.set(15, y, ps); g.set(16, y, INK); }
  }
  if (!short) { g.row(47, 10, 14, ph); g.row(47, 17, 21, ps); } // knee pads under the pants
  if (short) {
    for (let y = 45; y <= 48; y++) { g.row(y, 9, 14, skin); g.row(y, 17, 22, shade(skin, 0.86)); }
    if (d.compression !== 'none') { const c = dripColor(d.compression, C, '#1c1d21'); g.row(45, 9, 14, c); g.row(45, 17, 22, shade(c, 0.86)); }
  }
  [['right', 9, 14, 1], ['left', 17, 22, 0.86]].forEach(([side, a, b, tone]) => {
    if (!on(d.legSleeves, side)) return;
    const c = shade(dripColor(d.legColor, C, '#1c1d21'), tone);
    for (let y = short ? (d.compression !== 'none' ? 46 : 45) : 48; y <= 49; y++) g.row(y, a, b, c);
  });
  const s = C.socks, sk = [C.trim, C.numbers].find((x) => x && x !== s) || '#f1f3f5';
  for (let y = 49; y <= 52; y++) {
    if (!on(d.legSleeves, 'right') || y >= 50) g.row(y, 9, 14, s);
    if (!on(d.legSleeves, 'left') || y >= 50) g.row(y, 17, 22, shade(s, 0.88));
  }
  g.row(50, 9, 14, sk); g.row(50, 17, 22, shade(sk, 0.88));
  g.row(53, 8, 14, CLEAT); g.row(53, 17, 23, CLEAT); g.row(54, 8, 15, CLEAT); g.row(54, 16, 23, CLEAT);
  g.row(55, 8, 15, '#3a3b40'); g.row(55, 16, 23, '#3a3b40');
  const swoosh = C.trim === CLEAT ? '#f1f3f5' : C.trim;
  g.row(53, 10, 11, swoosh); g.row(53, 19, 20, swoosh);
}
