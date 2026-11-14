// The side-view player art, cut into the pieces that bend: body (helmet to belt), upper arm, forearm, thigh and shin for
// each side. Every drip item shows: helmet model and design, undershirt, arm sleeves (solid, stripe, two-tone), gloves,
// the QB play sheet, classic or short pants, compression shorts, leg sleeves, socks and cleats. Faces right.
// Each piece: { px: Map 'x,y' -> color, pivot: [x, y] (the joint it turns around), end: [x, y] (where the next piece attaches) }.
import { shade } from './pixels.js';

const piece = (pivot, end) => { const px = new Map(); return { px, pivot, end, set(x, y, c) { if (c) px.set(`${x},${y}`, c); }, row(y, a, b, c) { for (let x = a; x <= b; x++) this.set(x, y, c); } }; };
const on = (sideSetting, which) => sideSetting === 'both' || sideSetting === which;
const tok = (t, C, fb) => (!t || t === 'none' ? fb : { jersey: C.jersey, trim: C.trim, numbers: C.numbers, white: '#f1f3f5', black: '#1c1d21' }[t] || t);
const SHELLS = {
  f7: [[2, 10, 21], ...Array.from({ length: 15 }, (_, i) => [3 + i, 9, 22])],
  axiom: [[3, 11, 20], [4, 9, 22], ...Array.from({ length: 13 }, (_, i) => [5 + i, 8, 22])],
  speedflex: [[1, 12, 18], [2, 10, 20], [3, 9, 21], ...Array.from({ length: 12 }, (_, i) => [4 + i, 8, 22]), [16, 9, 22], [17, 10, 22]],
};

function body(look, w) {
  const C = look.colors, d = look.drip || {}, skin = look.face.skin || '#c48a5f', model = d.helmet || 'speedflex', hw = Math.round(w / 2);
  const B = piece([15.5 + hw, 40.5], null), h = C.helmet, hs = shade(h, 0.68), hh = shade(h, 1.3), j = C.jersey, js = shade(j, 0.72), jh = shade(j, 1.18);
  const H = (x, y, c) => B.set(x + hw, y, c);
  const shell = SHELLS[model] || SHELLS.speedflex;
  shell.forEach(([y, a, b]) => { for (let x = a; x <= b; x++) H(x, y, h); H(a, y, hs); if (y < 8) H(b, y, hh); });
  for (let x = 9; x <= 18; x++) H(x, 18, hs);
  const s = C.stripe === h ? C.numbers : C.stripe, ds = look.design || 'stripe';
  if (ds !== 'plain' && ds !== 'logo') shell.slice(0, 3).forEach(([y, a, b]) => { for (let x = a + 1; x < b; x++) H(x, y, s); });
  if (ds === 'logo' || ds === 'logo_stripe') for (let y = 8; y <= 10; y++) for (let x = 11; x <= 14; x++) H(x, y, C.numbers);
  for (let x = 13; x <= 14; x++) for (let y = 12; y <= 13; y++) H(x, y, '#141518');
  for (let y = 9; y <= 17; y++) for (let x = 19; x <= 21; x++) H(x, y, y === 11 && x === 20 ? '#1d1712' : shade(skin, y > 14 ? 0.85 : 1));
  const m = C.mask, ms = shade(m, 0.75), bars = model === 'f7' ? [10, 12, 14, 16] : model === 'axiom' ? [11, 15] : [10, 13, 16];
  for (let y = 8; y <= 18; y++) { H(23, y, m); H(24, y, ms); } bars.forEach((y) => { for (let x = 20; x <= 25; x++) H(x, y, m); });
  if (model === 'axiom') for (let x = 15; x <= 18; x++) H(x, 5, '#141518');
  for (let y = 19; y <= 22; y++) for (let x = 14; x <= 17; x++) H(x, y, shade(skin, 0.82));
  if (d.undershirt && d.undershirt !== 'none') for (let x = 13; x <= 18; x++) H(x, 22, tok(d.undershirtColor, C, '#1c1d21'));
  const pads = [[23, 12, 19], [24, 11, 20], [25, 10, 21], [26, 10, 21], [27, 10, 21], [28, 10, 21], [29, 10, 21], [30, 11, 20]];
  const wideRow = (y, a, b, c, edge0, edge1) => { for (let x = a; x <= b + w; x++) B.set(x, y, c); B.set(a, y, edge0); B.set(a + 1, y, edge0); B.set(b + w, y, edge1); };
  pads.forEach(([y, a, b]) => wideRow(y, a, b, j, js, jh));
  for (let x = 13; x <= 17 + w; x++) B.set(x, 24, jh);
  for (let y = 31; y <= 39; y++) wideRow(y, 11, 20, j, js, jh);
  for (let x = 11; x <= 20 + w; x++) { B.set(x, 39, shade(j, 0.9)); B.set(x, 40, shade(C.pants, 0.7)); }
  return B;
}

// An arm: upper (sleeve, then undershirt / arm sleeve / skin) and forearm (skin or sleeve, glove). which: 'right' near, 'left' far.
function arm(look, which, tone, hw) {
  const C = look.colors, d = look.drip || {}, skin = shade(look.face.skin || '#c48a5f', tone), j = shade(C.jersey, tone);
  const U = piece([16 + hw, 26], [16.5 + hw, 32.5]), F = piece([16.5 + hw, 33], [16.5 + hw, 39.5]);
  const under = d.undershirt && d.undershirt !== 'none' ? shade(tok(d.undershirtColor, C, '#1c1d21'), tone) : null;
  const sl = on(d.sleeves, which) ? [shade(tok(d.sleeveColor, C, '#1c1d21'), tone), shade(tok(d.sleeveColor2, C, '#f1f3f5'), tone)] : null;
  const armAt = (y, rowFrom) => (sl ? (d.sleeveStyle === 'two_tone' && y >= 36 ? sl[1] : d.sleeveStyle === 'stripe' && y === 35 ? sl[1] : sl[0]) : under && (d.undershirt === 'long' || y <= rowFrom) ? under : skin);
  for (let y = 25; y <= 29; y++) U.row(y, 14 + hw, 18 + hw, y === 28 ? shade(C.trim, tone) : j);
  U.set(14 + hw, 25, shade(j, 0.8)); for (let y = 25; y <= 29; y++) U.set(14 + hw, y, shade(j, 0.78));
  for (let y = 30; y <= 32; y++) U.row(y, 15 + hw, 18 + hw, armAt(y, 31));
  for (let y = 33; y <= 37; y++) F.row(y, 15 + hw, 18 + hw, armAt(y, 0));
  const gl = on(d.gloves ?? 'both', which) ? shade(tok(d.gloveColor || 'trim', C, C.trim), tone) : skin;
  F.row(38, 15 + hw, 18 + hw, gl); F.row(39, 15 + hw, 18 + hw, gl);
  if (d.playsheet && which === 'left') { F.row(34, 15 + hw, 18 + hw, shade('#f4f4f0', tone)); F.row(35, 15 + hw, 18 + hw, shade('#5a6270', tone)); }   // QBs wear it on the left wrist
  return [U, F];
}

// A leg: thigh (pants with the side stripe, or short pants over skin / compression) and shin (leg sleeve, sock, cleat).
function leg(look, which, tone, hw, tall) {
  const C = look.colors, d = look.drip || {}, skin = shade(look.face.skin || '#c48a5f', tone), p = shade(C.pants, tone);
  const T = piece([15.5 + hw, 41], [15.5 + hw, 47.5]), S = piece([15.5 + hw, 48], null);
  const stripe = shade([C.trim, C.numbers, C.jersey].find((c) => c && c !== C.pants) || '#1c1d21', tone), short = d.pants === 'short';
  for (let y = 41; y <= 47; y++) {
    const bare = short && y >= 45, c = bare ? (d.compression && d.compression !== 'none' && y === 45 ? shade(tok(d.compression, C, '#1c1d21'), tone) : skin) : p;
    T.row(y, 13 + hw, 18 + hw, c); if (!bare) { T.set(15 + hw, y, stripe); T.set(16 + hw, y, stripe); T.set(13 + hw, y, shade(p, 0.8)); }
  }
  if (!short) T.row(46, 14 + hw, 18 + hw, shade(p, 1.08));
  const sock = shade(C.socks || C.jersey, tone), sk = shade([C.trim, C.numbers].find((x) => x && x !== C.socks) || '#f1f3f5', tone);
  const ls = on(d.legSleeves, which) ? shade(tok(d.legColor, C, '#1c1d21'), tone) : null, end = 52 + tall;
  for (let y = 48; y <= end; y++) S.row(y, 14 + hw, 17 + hw, ls && y <= 49 ? ls : y === 50 ? sk : sock);
  S.row(end + 1, 13 + hw, 20 + hw, '#17171a'); S.row(end + 2, 13 + hw, 21 + hw, '#17171a'); S.row(end + 3, 13 + hw, 21 + hw, '#3a3b40');
  const sw = C.trim === '#17171a' ? '#f1f3f5' : shade(C.trim, tone); S.set(17 + hw, end + 1, sw); S.set(18 + hw, end + 1, sw);
  S.toe = [21 + hw, end + 3];
  return [T, S];
}

// look: { colors, face, drip, design, wide, tall }. face: 1 facing right (his right arm and leg toward the camera), -1 left
// (his left side toward the camera), so a sleeve or leg sleeve on one side shows when that side faces us.
export function sideArt(look, face = 1) {
  const w = look.wide || 0, hw = Math.round(w / 2), t = look.tall || 0, near = face < 0 ? 'left' : 'right', far = face < 0 ? 'right' : 'left';
  const [nu, nf] = arm(look, near, 1, hw), [fu, ff] = arm(look, far, 0.78, hw), [nt, ns] = leg(look, near, 1, hw, t), [ft, fs] = leg(look, far, 0.8, hw, t);
  return { body: body(look, w), nu, nf, fu, ff, nt, ns, ft, fs };
}
