// The officials' pixel art, drawn the same way as the players (fieldSideArt): pieces that bend at the joints, on the
// same 32x56 frame, so a referee stands next to a player at the right size. Black-and-white striped shirt with a black
// collar, short striped sleeves, whistle on a lanyard, black belt with a silver buckle, black pants and shoes, and a black
// cap with white piping (the referee's is white). His skin and the hair under his cap vary; the yellow flag hangs from his
// belt until he throws it. Two views: the side (faces right, bends like a player) and the front (arms swing out for signals).
import { shade } from './pixels.js';

export const WHT = '#f2f2ee', BLK = '#17181c';
const WS = '#d4d4cc', BH = '#2d2f36', PANT = '#1c1d22', PH = '#30323a', PS = '#0e0f12', SHOE = '#0b0b0d', SOLE = '#2c2d33', SILVER = '#c9ced6', FLAG = '#ffd21a', FLAGS = '#d6a300';

const piece = (pivot, end) => ({ px: new Map(), pivot, end, set(x, y, c) { if (c) this.px.set(`${x},${y}`, c); }, row(y, a, b, c) { for (let x = a; x <= b; x++) this.set(x, y, c); } });
const stripe = (x, x0, tone = 1, y = 30) => { const w = ((x - x0) >> 1) % 2 === 0; const c = w ? (((x - x0) & 1) ? WS : WHT) : (((x - x0) & 1) ? BLK : BH); return tone === 1 ? (y > 34 && w ? shade(c, 0.94) : c) : shade(c, tone); };
const capCols = (look) => (look.cap === 'white' ? [WHT, WS, BLK] : [BLK, '#0c0d10', '#e9e9e4']);   // [crown, brim, piping]

// ---- side view (faces right; same pivots as a player so fieldRig bends him) ----
function sideBody(look) {
  const B = piece([15.5, 40.5], null), skin = look.skin, sk2 = shade(skin, 0.84), hair = look.hair, [cap, brim, pipe] = capCols(look);
  [[6, 13, 18], [7, 12, 19], [8, 12, 20], [9, 12, 20]].forEach(([y, a, b]) => { B.row(y, a, b, cap); B.set(a, y, shade(cap, 0.8)); });
  B.row(9, 12, 20, pipe === BLK ? BLK : brim); B.set(16, 6, pipe); B.set(16, 7, pipe); B.set(17, 8, pipe);
  B.row(10, 17, 23, brim); B.row(11, 19, 22, shade(brim, 0.75));                                    // the brim, out over his eyes
  for (let y = 10; y <= 19; y++) B.row(y, 13, 20, skin);
  for (let y = 10; y <= 13; y++) B.row(y, 12, 13, hair);                                             // hair under the cap
  B.row(11, 18, 20, shade(skin, 0.72));                                                             // the brim's shadow
  B.set(19, 13, '#1a1410'); B.row(12, 18, 20, hair); B.set(21, 14, skin); B.set(21, 15, sk2);         // eye, brow, nose
  B.set(15, 13, sk2); B.set(15, 14, shade(skin, 0.7)); B.set(16, 13, sk2); B.set(15, 15, sk2);         // ear
  B.row(17, 19, 20, shade(skin, 0.66)); for (let y = 16; y <= 19; y++) B.set(14, y, sk2); B.row(19, 15, 19, sk2);
  B.row(20, 15, 18, shade(skin, 0.8)); B.row(21, 15, 18, shade(skin, 0.74));                           // neck
  B.row(22, 14, 19, BLK); B.row(23, 18, 20, BLK);                                                   // the collar
  for (let y = 23; y <= 38; y++) { const a = y < 25 ? 13 : 12, b = y >= 26 && y <= 31 ? 21 : 20; for (let x = a; x <= b; x++) if (!(y === 23 && x >= 18)) B.set(x, y, stripe(x, 12, 1, y)); B.set(a, y, shade(B.px.get(`${a},${y}`) || WHT, 0.8)); }
  B.row(39, 12, 20, BLK); B.row(40, 12, 20, BLK); B.set(19, 39, SILVER); B.set(20, 39, SILVER); B.set(19, 40, '#8d939c');
  if (look.flag) { B.set(11, 40, FLAG); B.set(11, 41, FLAG); B.set(11, 42, FLAGS); B.set(12, 41, FLAGS); }   // the flag tucked in his belt
  return B;
}
function sideArm(look, tone) {
  const U = piece([16, 24.5], [16.5, 34.5]), F = piece([16.5, 35], [16.5, 44.5]), sk = shade(look.skin, tone);
  for (let y = 24; y <= 29; y++) for (let x = 14; x <= 18; x++) U.set(x, y, stripe(x, 14, tone));
  U.row(30, 14, 18, shade(BLK, tone)); for (let y = 31; y <= 34; y++) U.row(y, 15, 18, sk);
  for (let y = 35; y <= 41; y++) F.row(y, 15, 18, y === 40 ? shade(look.skin, tone * 0.9) : sk); F.row(42, 15, 18, sk); F.row(43, 15, 18, sk); F.row(44, 16, 18, shade(look.skin, tone * 0.85));
  return [U, F];
}
function sideLeg(tone) {
  const T = piece([15.5, 41], [15.5, 47.5]), S = piece([15.5, 48], null), p = shade(PANT, tone);
  for (let y = 41; y <= 47; y++) { T.row(y, 13, 18, p); T.set(17, y, shade(PH, tone)); T.set(13, y, shade(PS, tone)); }
  for (let y = 48; y <= 52; y++) { S.row(y, 14, 17, p); S.set(16, y, shade(PH, tone)); }
  S.row(53, 13, 20, SHOE); S.row(54, 13, 21, SHOE); S.row(55, 13, 21, SOLE); S.set(18, 53, '#45474f'); S.set(19, 53, '#45474f');
  return [T, S];
}
// look: { skin, hair, cap ('white' for the referee), flag }. Same shape as fieldSideArt's sideArt, for fieldRig.
export function refSide(look) {
  const [nu, nf] = sideArm(look, 1), [fu, ff] = sideArm(look, 0.78), [nt, ns] = sideLeg(1), [ft, fs] = sideLeg(0.8);
  return { body: sideBody(look), nu, nf, fu, ff, nt, ns, ft, fs };
}

// ---- front view (facing the camera): body, two two-piece arms, two legs ----
function frontBody(look) {
  const B = piece([15.5, 40.5], null), skin = look.skin, sk2 = shade(skin, 0.86), hair = look.hair, [cap, brim, pipe] = capCols(look);
  [[6, 13, 18], [7, 12, 19], [8, 12, 19], [9, 12, 19]].forEach(([y, a, b]) => { B.row(y, a, b, cap); B.set(a, y, shade(cap, 0.85)); B.set(b, y, shade(cap, 0.75)); });
  for (let y = 6; y <= 9; y++) B.set(15, y, pipe); B.set(15, 5, pipe);                                // the button and the piping down the front
  B.row(10, 11, 20, brim); B.row(10, 11, 11, shade(brim, 0.8));
  for (let y = 11; y <= 19; y++) B.row(y, 12, 19, skin);
  B.row(11, 12, 19, shade(skin, 0.7)); B.set(11, 13, sk2); B.set(11, 14, sk2); B.set(20, 13, shade(skin, 0.78)); B.set(20, 14, shade(skin, 0.78));   // brim shadow, ears
  B.set(12, 12, hair); B.set(19, 12, hair); B.row(12, 13, 14, shade(hair, 1.1)); B.row(12, 17, 18, shade(hair, 1.1));   // sideburns, brows
  B.set(14, 13, '#1a1410'); B.set(17, 13, '#1a1410'); B.set(13, 13, '#f4efe8'); B.set(18, 13, '#f4efe8');   // eyes
  B.set(15, 15, sk2); B.set(16, 15, shade(skin, 0.78));                                               // nose
  B.row(17, 14, 17, shade(skin, 0.72)); B.row(17, 15, 16, shade(skin, 0.6));                          // mouth
  for (let y = 15; y <= 18; y++) { B.set(12, y, sk2); B.set(19, y, shade(skin, 0.8)); } B.row(19, 13, 18, sk2);
  B.row(20, 14, 17, shade(skin, 0.8)); B.row(21, 14, 17, shade(skin, 0.72));
  B.row(22, 12, 19, BLK); B.set(15, 22, shade(skin, 0.7)); B.set(16, 22, shade(skin, 0.7)); B.row(23, 12, 14, BLK); B.row(23, 17, 19, BLK);   // the collar, open at the neck
  for (let y = 23; y <= 38; y++) { const a = y === 23 ? 10 : y >= 33 ? 10 : 9, b = 31 - a; for (let x = a; x <= b; x++) if (!(y === 23 && x >= 12 && x <= 19)) B.set(x, y, stripe(x, 9, 1, y)); }
  [[15, 24], [15, 25], [16, 26]].forEach(([x, y]) => B.set(x, y, BLK)); B.set(16, 27, SILVER); B.set(16, 28, '#8d939c'); B.set(17, 27, '#eef1f5');   // lanyard, whistle
  B.row(39, 10, 21, BLK); B.row(40, 10, 21, BLK); B.row(39, 15, 16, SILVER); B.row(40, 15, 16, '#8d939c');
  if (look.flag) { B.set(20, 41, FLAG); B.set(21, 41, FLAG); B.set(20, 42, FLAGS); B.set(21, 42, FLAG); B.set(21, 43, FLAGS); }
  return B;
}
function frontArm(look, side) {   // side -1: the arm on the left of the screen (his right), 1: the right of the screen
  const m = (x) => (side < 0 ? x : 31 - x), tone = side < 0 ? 1 : 0.92, sk = shade(look.skin, tone);
  const U = piece([m(9) + 0.5, 24.5], [m(9) + 0.5, 34]), F = piece([m(9) + 0.5, 34], [m(9) + 0.5, 44]);
  for (let y = 24; y <= 29; y++) for (let x = 7; x <= 10; x++) U.set(m(x), y, stripe(x, 7, tone));
  U.row(30, Math.min(m(7), m(10)), Math.max(m(7), m(10)), shade(BLK, tone));
  for (let y = 31; y <= 33; y++) for (let x = 8; x <= 10; x++) U.set(m(x), y, sk);
  for (let y = 34; y <= 40; y++) for (let x = 8; x <= 10; x++) F.set(m(x), y, x === 8 ? shade(look.skin, tone * 0.9) : sk);
  for (let y = 41; y <= 43; y++) for (let x = 7; x <= 10; x++) F.set(m(x), y, y === 43 ? shade(look.skin, tone * 0.85) : sk);
  return [U, F];
}
function frontLeg(side) {
  const m = (x) => (side < 0 ? x : 31 - x), L = piece([m(13), 41], null);
  for (let y = 41; y <= 52; y++) for (let x = (y >= 47 ? 11 : 10); x <= 15; x++) L.set(m(x), y, x === (y >= 47 ? 11 : 10) ? PH : x === 15 ? PS : PANT);
  for (let x = 10; x <= 15; x++) { L.set(m(x), 53, '#1a1b1f'); L.set(m(x), 54, SHOE); L.set(m(x), 55, SOLE); } L.set(m(12), 53, '#45474f');
  return L;
}
export function refFront(look) {
  const [lu, lf] = frontArm(look, -1), [ru, rf] = frontArm(look, 1);
  return { body: frontBody(look), lu, lf, ru, rf, ll: frontLeg(-1), rl: frontLeg(1) };
}
