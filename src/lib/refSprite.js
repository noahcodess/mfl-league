// Turns an official into a picture for this frame, in the players' pixel style (refArt): running (a jog, a run or a long
// stride, or backpedaling to keep the play in front of him) and throwing the flag from the side view, bending at every
// joint like a player (fieldRig); signals from the front view, facing the camera, with his arms swinging smoothly through
// them (armsFor). Every picture is drawn once and reused.
import { POSES, rigFrame, paint } from './fieldRig.js';
import { refSide, refFront } from './refArt.js';
import { INK } from './uniformDraw.js';
import { SKINS } from './portraitLooks.js';

const RUN = POSES.run, rad = (d) => (d * Math.PI) / 180;
const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)], add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const scale = (f, k, tilt, fore) => [tilt, f[1] * k, f[2] * k + fore, f[3] * k, f[4] * k + fore, f[5] * k, f[6] * k, f[7] * k, f[8] * k];
// The officials' own poses (added to the players' book so fieldRig can bend them).
Object.assign(POSES, {
  refstand: [[1, 4, 10, -4, 10, 3, 0, -3, -1]],
  refwalk: RUN.map((f) => scale(f, 0.4, 3, -6)),
  refjog: RUN.map((f) => scale(f, 0.6, 6, 8)),       // short choppy strides, elbows bent
  refrun: RUN.map((f) => scale(f, 0.8, 9, 4)),
  refstride: RUN.map((f) => scale(f, 0.95, 8, -4)),     // long, loping strides
  refback: POSES.backpedal.map((f) => [6, ...f.slice(1)]),
  refthrow: [[-4, -140, -175, 10, 20, 15, -5, -15, -20], [6, 155, 140, -10, 15, 20, -10, -20, -30], [12, 95, 80, -20, 10, 25, -15, -20, -35]],
  refarm: [[1, 160, 172, -4, 10, 3, 0, -3, -1]],   // arm up (tipped a little forward so it shows in front of his cap)
});
POSES.refarmjog = POSES.refjog.map((f) => [f[0] - 3, 160, 172, ...f.slice(3)]);   // still running, arm straight up after the flag
const GAITS = [['refjog', 2.1], ['refrun', 1.7], ['refstride', 1.4]];   // [pose, frames per yard covered]
const HAIR = ['#1e1610', '#3b2a1c', '#6b4b2f', '#8f8f8a', '#141212', '#4a3524', '#b9b6ae'];

// One look per official for this game: his skin and hair (from the game's seed), his cap, and two versions (flag in his belt, flag thrown).
export function refLook(code, cap, seed) {
  let h = seed >>> 0; for (const ch of code) h = (Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0);
  const base = { skin: SKINS[1 + (h % 8)], hair: HAIR[(h >>> 5) % HAIR.length], cap };
  const make = (flag) => { const l = { ...base, flag, armEdge: true, key: `ref|${code}|${h}|${flag ? 1 : 0}` }, art = refSide(l); l.rig = { 1: art, '-1': art }; return l; };
  return { tucked: make(true), out: make(false) };
}

// Arm angles for a signal, facing the camera: [screen-left shoulder, elbow, screen-right shoulder, elbow]. 0 = hanging,
// 90 = straight out to the side, 180 = straight up; a negative elbow folds the forearm in across him. u: seconds into it,
// dir: which way he points (1 = screen right), slow: how fast he moves through it (the close-up is slower).
export function armsFor(sig, u, dir = 1, slow = 1) {
  const w = Math.sin(u * 5 * slow), w2 = Math.sin(u * 3.4 * slow), c2 = Math.cos(u * 3.4 * slow);
  const point = (deg) => (dir > 0 ? [8, 0, deg, 0] : [deg, 0, 8, 0]);
  switch (sig) {
    case 'flagArm': return [172, 0, 8, 0];
    case 'td': return [166 + 3 * w2, 4, 166 + 3 * w2, 4];
    case 'incomplete': return [25 + 70 * w, 0, 25 + 70 * w, 0];                    // both arms swinging across in front of him
    case 'first': return point(88 + 3 * w2);
    case 'point': return point(84);                                               // at the team that fouled
    case 'timeout': return [146, 62 + 12 * w2, 146, 62 - 12 * w2];                 // hands crossing back and forth over his head
    case 'Holding': case 'Defensive holding': return [28 + 6 * w2, -118, 32 + 6 * w2, -122 + 8 * w2];   // gripping his wrist, yanking it down
    case 'False start': return [24 + 5 * c2, -114 + 22 * w2, 24 - 5 * c2, -114 - 22 * w2];             // forearms rolling over each other
    case 'Offside': return [40, -82, 40, -82];                                    // hands on his hips
    case 'Defensive pass interference': case 'Offensive pass interference': { const p = 0.5 + 0.5 * w2; return [28 + 18 * p, 132, 28 + 18 * p, 132]; }   // the push
    case 'Delay of game': return [16, -104, 20, -97];                             // arms folded
    case 'Illegal touching': return [40, -174 + 9 * w2, 40, -174 + 9 * w2];          // fingertips tapping both shoulders
    default: return [8, 0, 8, 0];
  }
}
export const blendArms = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
export const ease = (k) => { const x = Math.max(0, Math.min(1, k)); return x * x * (3 - 2 * x); };

const cache = new Map();
function remember(key, make) { let c = cache.get(key); if (!c) { if (cache.size > 1500) cache.clear(); c = make(); cache.set(key, c); } return c; }

// The front view with the arms at these angles. The arms get their own dark edge where they cross in front of the shirt.
function frontFrame(look, arms) {
  const art = (look.frontArt ||= refFront(look)), pts = [];
  paint(art.ll, 0, art.ll.pivot, pts, 'leg'); paint(art.rl, 0, art.rl.pivot, pts, 'leg'); paint(art.body, 0, art.body.pivot, pts, 'body');
  const arm = (U, F, s, e, sg) => { const au = rad(s * sg), el = add(U.pivot, rot(sub(U.end, U.pivot), au)), af = rad((s + e) * sg); paint(U, au, U.pivot, pts, 'arm'); paint(F, af, el, pts, 'arm'); };
  arm(art.lu, art.lf, arms[0], arms[1], 1); arm(art.ru, art.rf, arms[2], arms[3], -1);
  const cw = 48, ch = 64, ox = 8, oy = ch - 3 - 55, px = new Array(cw * ch).fill(null), tag = new Array(cw * ch).fill(null);
  pts.forEach(([x, y, c, t]) => { const X = x + ox, Y = y + oy; if (X >= 0 && Y >= 0 && X < cw && Y < ch) { px[Y * cw + X] = c; tag[Y * cw + X] = t; } });
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const ctx = cv.getContext('2d');
  const at = (x, y) => (x < 0 || y < 0 || x >= cw || y >= ch ? -1 : y * cw + x);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const k = y * cw + x, n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].filter((i) => i >= 0);
    if (px[k]) { const edge = tag[k] !== 'arm' && n.some((i) => tag[i] === 'arm') && tag[k] === 'body'; ctx.fillStyle = edge ? INK : px[k]; ctx.fillRect(x, y, 1, 1); continue; }
    if (n.some((i) => px[i])) { ctx.fillStyle = INK; ctx.fillRect(x, y, 1, 1); }
  }
  cv.footX = 24; cv.footY = ch - 3; cv.hand = [cw / 2, 20]; cv.hand2 = cv.hand;
  return cv;
}

// ref: the live official (sceneRefs). t: scene time. over: the close-up's pose { view, arms, pose, frame, face } (refCallShow).
export function refSprite(ref, t, over = null) {
  const look = ref.thrown ? ref.look.out : ref.look.tucked;
  if (over?.arms) { const q = over.arms.map((a) => Math.round(a / 3) * 3); return remember(`${look.key}|F|${q}`, () => frontFrame(look, q)); }
  if (over?.pose) return remember(`${look.key}|S|${over.pose}|${over.frame}|${over.face}`, () => rigFrame(look, over.pose, over.frame, over.face));
  const sig = ref.sig, u = t - (ref.sigAt || 0);
  if (ref.sp > 0.9) ref.mv = true; else if (ref.sp < 0.35) ref.mv = false;   // a little give, so he doesn't flicker between standing and running
  let pose = 'refstand', frame = 0, face = ref.face || 1;
  if (sig === 'throw') { pose = 'refthrow'; frame = u < 0.16 ? 0 : u < 0.34 ? 1 : 2; face = ref.throwFace || face; }
  else if (sig && sig !== 'flagArm' && !ref.mv) {   // a signal: he stops and turns to the camera
    const arms = blendArms([8, 0, 8, 0], armsFor(sig, u, ref.dir || 1), ease(u / 0.3)).map((a) => Math.round(a / 4) * 4);
    return remember(`${look.key}|F|${arms}`, () => frontFrame(look, arms));
  } else if (ref.mv) {
    const back = ref.back, [gp, fpy] = GAITS[ref.gait || 0];
    pose = sig === 'flagArm' ? 'refarmjog' : back ? 'refback' : ref.sp < 3 ? 'refwalk' : gp;
    frame = Math.floor((ref.run || 0) * (back ? 1.6 : fpy)) % (pose === 'refback' ? 2 : 4);
  } else if (sig === 'flagArm') pose = 'refarm';
  return remember(`${look.key}|S|${pose}|${frame}|${face}`, () => rigFrame(look, pose, frame, face));
}
