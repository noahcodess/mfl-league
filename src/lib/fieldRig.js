// The side-view skeleton: bends the side art (fieldSideArt.js) at the waist, shoulders, elbows, hips and knees to make
// every pose, then plants the lowest foot (or hand, in a 3-point stance) on the ground. Angles are in degrees: the body
// tilts forward when positive; a limb hanging straight down is 0 and swings forward (toward where he faces) when positive.
import { sideArt } from './fieldSideArt.js';
import { INK } from './uniformDraw.js';

// [tilt, near upper arm, near forearm, far upper arm, far forearm, near thigh, near shin, far thigh, far shin, lift]
const P = (...a) => a;
const RUN = [P(12, -35, 20, 45, 100, 45, 5, -30, -75), P(14, 5, 70, 10, 70, 15, -40, 5, -10), P(12, 45, 100, -35, 20, -30, -75, 45, 5), P(14, 10, 70, 5, 70, 5, -10, 15, -40)];
const tuck = (f) => [f[0], 10, 105, ...f.slice(3)];                              // ball tucked under the near arm
const ear = (f) => [f[0] - 4, -100, 175, 50, 140, ...f.slice(5)];                  // ball up by his ear
export const POSES = {
  stand: [P(2, 6, 14, -4, 10, 5, 0, -5, -2)],
  run: RUN, carry: RUN.map(tuck),
  olset: [P(62, 6, 0, 35, 70, 80, -15, 55, -35)],          // 3-point stance: hand down, back flat
  dlset: [P(68, 0, -5, 20, 30, 75, -25, 45, -45)],
  qbset: [P(18, 40, 85, 35, 80, 25, -15, 15, -20)],          // hands ready for the snap
  rbset: [P(40, 30, 10, 25, 5, 50, -20, 40, -25)],          // hands on his knees
  wrset: [P(22, 30, 70, -25, 10, 30, -10, -20, -30)],       // staggered, ready to release
  cbset: [P(22, 20, 50, 15, 45, 35, -20, 25, -25)],
  lbset: [P(30, 25, 40, 20, 35, 45, -20, 35, -25)],
  qbready: [ear(P(8, 0, 0, 0, 0, 15, -5, -15, -15))],
  qbdrop: [ear(P(12, 0, 0, 0, 0, 30, -10, 0, -30)), ear(P(12, 0, 0, 0, 0, 0, -30, 30, -10))],
  throw: [P(-8, -120, 190, 70, 80, 30, 0, -30, -30), P(20, 150, 120, 20, 30, 20, -10, -40, -60), P(28, 60, 20, -10, 30, 15, -15, -45, -70)],
  block: [P(28, 75, 80, 70, 85, 40, -20, -10, -40), P(32, 85, 88, 80, 85, 35, -25, -15, -35)],
  anchor: [P(8, 65, 75, 60, 80, 25, -5, -30, -35), P(10, 70, 80, 64, 78, 28, -8, -26, -38)],
  driven: [P(-12, 55, 95, 50, 90, -10, -20, 30, 5), P(-16, 50, 100, 46, 95, -14, -24, 26, 0)],
  drive: [P(45, 90, 92, 85, 90, 55, -15, -35, -70), P(48, 92, 90, 88, 92, 40, -25, -20, -60)],
  swim: [P(30, 165, 200, 80, 95, 50, -15, -30, -60), P(34, 120, 60, 60, 90, 40, -20, -35, -65)],
  rush: [P(40, 85, 90, 80, 92, 45, -10, -35, -65), P(38, 88, 92, 84, 90, 30, -25, -15, -40)],
  catch: [P(0, 150, 165, 145, 160, 15, -5, -10, -25, 1)],
  reach: [P(10, 80, 100, 75, 95, 30, -5, -20, -40)],
  drop: [P(-4, 60, 40, 50, 30, 15, -5, -10, -25), P(-6, 165, 250, 160, 245, 5, 0, -5, -2)],
  cut: [P(30, -30, 10, 50, 80, 60, 20, -40, -60)],
  juke: [P(5, 60, 90, -50, -20, 55, 10, -45, -50)],
  stiff: [P(18, 92, 92, 10, 105, 45, 5, -30, -75)],
  kick: [P(-5, -40, -30, 60, 80, -45, -70, 10, 0), P(-15, -50, -40, 80, 100, 100, 95, 5, -5)],
  kneel: [P(5, 20, 70, 20, 70, 90, 0, 0, -90)],
  backpedal: [P(18, 25, 60, 15, 55, 30, -10, 0, -30), P(18, 15, 55, 25, 60, 0, -30, 30, -10)],
  cheer: [P(-4, 170, 175, 165, 170, 5, 0, -5, -2), P(-6, 160, 185, 175, 165, 10, -5, -10, -20, 3)],
  tackle: [P(40, 90, 95, 85, 90, 50, -10, -30, -70)],
  wrap: [P(32, 70, 140, 66, 135, 45, -10, -20, -55)],                      // arms around the carrier, driving through
  layout: [P(20, 100, 95, 95, 92, -20, -30, -45, -40)],                     // a full-out dive (drawn tipped forward)
  stumble: [P(38, 125, 60, -45, -15, 65, 35, -50, -85), P(44, 140, 80, -30, -5, 55, 20, -60, -95)],   // tripped up, arms out for balance
  pump: [P(-6, -110, 185, 60, 75, 28, 0, -28, -30), P(8, 70, 110, 40, 60, 24, -5, -32, -40)],         // the pump fake: cocks it, starts forward, holds
  // catches: the hands go where the ball is (sceneBall puts the ball between them)
  hands: [P(8, 80, 130, 74, 124, 45, 5, -30, -75), P(10, 80, 130, 74, 124, -30, -75, 45, 5)],         // in stride, hands out in front of his face
  shoulder: [P(14, 192, 212, 186, 206, 45, 5, -30, -75), P(14, 192, 212, 186, 206, -30, -75, 45, 5)], // over the shoulder: running away, hands up and back
  highpoint: [P(-6, 132, 150, 126, 144, 60, -35, 20, -60)],                                       // up in the air, both hands up (the jump itself is sceneCatch's hop)
  onehand: [P(-2, 118, 132, -20, 12, 50, -25, 10, -45)],                                           // reaching up with one hand
  scoop: [P(40, 32, 16, 26, 12, 62, -10, -35, -70)],                                                  // a low ball, scooped off his shoe tops
  contest: [P(0, 138, 156, 70, 92, 45, -25, 5, -40)],                                              // a defender going up with him, arm in
  swat: [P(-2, 140, 162, 60, 80, 42, -25, 5, -40, 3), P(14, 92, 48, 60, 80, 42, -25, 5, -40, 2)],      // knocking it away: arm up, then chopping down through it
  stretch: [P(55, 96, 92, 40, 70, 70, 20, -40, -70)],
  // a cut: the near foot (frame 0) or the far foot (frame 1) planted wide out in front, body sunk and leaning into it
  plant: [P(26, -25, 15, 45, 85, 62, 30, -38, -62), P(26, 45, 85, -25, 15, -38, -62, 62, 30)],                                                 // going down, the ball stretched out over the line
};
POSES.plantc = POSES.plant.map(tuck);   // the same cut with the ball tucked
POSES.breakdown = [P(34, 70, 100, 62, 95, 62, -40, 30, -55), P(36, 72, 102, 64, 96, 50, -45, 42, -50)];   // a tackler's ready stance: hips sunk, arms out, choppy feet
POSES.stutter = [P(14, 0, 0, 30, 60, 40, -30, 20, -40), P(16, 0, 0, 30, 60, 20, -40, 40, -30)].map(tuck);   // the runner's stutter steps, ball tucked
POSES.truck = [tuck(P(46, 0, 0, 78, 62, 55, 5, -30, -75))];                                              // lowering the shoulder into him
const GROUND_HANDS = new Set(['olset', 'dlset']);
const rad = (d) => (d * Math.PI) / 180;
const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]], sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];

// Paints one piece turned by angle a (radians) with its pivot at `at`. Inverse mapping keeps it gap-free.
function paint(piece, a, at, out, tag) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  piece.px.forEach((_, k) => { const [x, y] = k.split(',').map(Number); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); });
  const corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map((p) => add2(at, rot(sub2(p, piece.pivot), a)));
  const bx0 = Math.floor(Math.min(...corners.map((c) => c[0]))), bx1 = Math.ceil(Math.max(...corners.map((c) => c[0])));
  const by0 = Math.floor(Math.min(...corners.map((c) => c[1]))), by1 = Math.ceil(Math.max(...corners.map((c) => c[1])));
  const c = Math.cos(a), s = Math.sin(a);
  for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
    const rx = x + 0.5 - at[0], ry = y + 0.5 - at[1], sx = c * rx + s * ry + piece.pivot[0], sy = -s * rx + c * ry + piece.pivot[1];
    const col = piece.px.get(`${Math.floor(sx)},${Math.floor(sy)}`);
    if (col) out.push([x, y, col, tag]);
  }
}

// Builds one side-view frame. Returns a canvas with footX/footY (where his feet meet the ground) and hand/hand2 (canvas
// spots of his near and far hand, for carrying the ball).
export function rigFrame(look, poseName, frame, face) {
  const rigs = (look.rig ||= {}), art = rigs[face] || (rigs[face] = sideArt(look, face));
  const list = POSES[poseName] || POSES.stand, f = list[frame % list.length], [tilt, nu, nf, fu, ff, nt, ns, ft, fs, lift = 0] = f;
  const hip = art.body.pivot, pts = [], ab = rad(tilt);
  const shoulder = add2(hip, rot(sub2(art.nu.pivot, hip), ab)), limb = (deg) => rad(-deg);
  const armAt = (U, F, du, df, at) => { paint(U, limb(du), at, pts, 'arm'); const el = add2(at, rot(sub2(U.end, U.pivot), limb(du))); paint(F, limb(df), el, pts, 'hand'); return add2(el, rot(sub2(F.end, F.pivot), limb(df))); };
  const legAt = (T, S, dt, ds, at) => { paint(T, limb(dt), at, pts, 'leg'); const kn = add2(at, rot(sub2(T.end, T.pivot), limb(dt))); paint(S, limb(ds), kn, pts, 'foot'); };
  const hand2 = armAt(art.fu, art.ff, fu, ff, add2(shoulder, [-1, 0]));
  legAt(art.ft, art.fs, ft, fs, art.ft.pivot);
  paint(art.body, ab, hip, pts, 'body');
  legAt(art.nt, art.ns, nt, ns, art.nt.pivot);
  const hand = armAt(art.nu, art.nf, nu, nf, shoulder);
  let ground = -1e9, xmin = 1e9, xmax = -1e9, ymin = 1e9;
  pts.forEach(([x, y, , tag]) => { if (tag === 'foot' || (tag === 'hand' && GROUND_HANDS.has(poseName))) ground = Math.max(ground, y); xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); });
  const cw = 72, ch = 84, ox = Math.round(cw / 2 - hip[0]), oy = ch - 3 - ground - lift * 2;
  const px = new Array(cw * ch).fill(null);
  pts.forEach(([x, y, c]) => { const X = x + ox, Y = y + oy; if (X >= 0 && Y >= 0 && X < cw && Y < ch) px[Y * cw + (face < 0 ? cw - 1 - X : X)] = c; });
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const k = px[y * cw + x];
    if (k) { ctx.fillStyle = k; ctx.fillRect(x, y, 1, 1); continue; }
    if ((x > 0 && px[y * cw + x - 1]) || (x < cw - 1 && px[y * cw + x + 1]) || (y > 0 && px[(y - 1) * cw + x]) || (y < ch - 1 && px[(y + 1) * cw + x])) { ctx.fillStyle = INK; ctx.fillRect(x, y, 1, 1); }
  }
  const flipX = (x) => (face < 0 ? cw - 1 - x : x);
  cv.footX = flipX(cw / 2); cv.footY = ch - 3 + lift * 0;
  cv.hand = [flipX(hand[0] + ox), hand[1] + oy]; cv.hand2 = [flipX(hand2[0] + ox), hand2[1] + oy];
  return cv;
}
