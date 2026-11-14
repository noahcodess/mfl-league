// The on-field player: his real drip sprite in three views. Front and back (fieldViews.js) move as parts; the side view
// bends at every joint (fieldRig.js). Big men are drawn wider and tall men get longer legs. Every pose is drawn once per
// player and reused, so a full game costs almost nothing.
import { W, H, INK } from './uniformDraw.js';
import { viewParts } from './fieldViews.js';
import { rigFrame } from './fieldRig.js';

const PAD_X = 12, PAD_TOP = 26, PAD_BOTTOM = 2;

// wide: extra pixels on each side of his body (0 slim, 1 average, 2 big, 3 huge). tall: extra pixels of leg (0 to 2).
export function buildOf(p) {
  const h = p.height || 73, w = p.weight || 215, bmi = (w / (h * h)) * 703;
  return { wide: bmi < 26.5 ? 0 : bmi < 30 ? 1 : bmi < 34 ? 2 : 3, tall: h >= 77 ? 2 : h >= 74 ? 1 : 0 };
}

// Stretches one view for his build: columns cA and cB repeat to widen him, a shin row repeats to make him taller.
function stretched(look, view) {
  const raw = viewParts(look, view), w = look.wide, t = look.tall, [cA, cB] = [8, 23], out = {};
  Object.entries(raw).forEach(([name, g]) => {
    const list = []; out[name] = list;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = g.get(x, y); if (!c) continue;
      const ys = y < 46 ? [y] : [y + t], all = y === 45 ? [...ys, ...Array.from({ length: t }, (_, i) => 46 + i)] : ys;
      all.forEach((yy) => {
        if (y < 23) list.push([x + w, yy, c]);
        else if (x < cA) list.push([x, yy, c]);
        else if (x === cA) for (let i = 0; i <= w; i++) list.push([cA + i, yy, c]);
        else if (x < cB) list.push([x + w, yy, c]);
        else if (x === cB) for (let i = 0; i <= w; i++) list.push([cB + w + i, yy, c]);
        else list.push([x + 2 * w, yy, c]);
      });
    }
  });
  return { parts: out, gw: W + 2 * w, gh: H + t };
}

// How each part moves: [dx, dy, flipped]. A flipped arm points up (hand above the shoulder). Side poses face right.
const UP = (dx, dy) => [dx, dy, true];
const FRONT = {
  stand: [() => ({})],
  set: [() => ({ body: [0, 4], legR: [-2, 0], legL: [2, 0], armR: [2, 9], armL: [0, 5] })],
  run: [(f) => ({ body: [f, 0], legR: [-1, -3], legL: [1, 0], armR: [0, 2], armL: [0, -2] }), (f) => ({ body: [f, 1], legR: [0, -1] }),
    (f) => ({ body: [f, 0], legR: [-1, 0], legL: [1, -3], armR: [0, -2], armL: [0, 2] }), (f) => ({ body: [f, 1], legL: [0, -1] })],
  block: [(f) => ({ body: [f, 2], legR: [-2, 0], legL: [2, 0], armR: [5, -2], armL: [-5, -2] }), (f) => ({ body: [2 * f, 2], legR: [-3, 0], legL: [2, -1], armR: [6, -3], armL: [-6, -3] })],
  throw: [(f) => ({ body: [-f, 0], legR: [-2, 0], legL: [2, 0], armR: UP(0, -17), armL: [3, -3] }), (f) => ({ body: [f, 1], legR: [-2, 0], legL: [2, -1], armR: [5, -9], armL: [-1, 1] })],
  catch: [() => ({ body: [0, -2], legR: [0, -2], legL: [0, -3], armR: UP(3, -24), armL: UP(-3, -24) })],
  cheer: [() => ({ armR: UP(0, -21), armL: UP(0, -21) }), () => ({ body: [0, -3], legR: [0, -3], legL: [0, -3], armR: UP(-1, -24), armL: UP(1, -24) })],
  kick: [(f) => ({ body: [-f, 0], legR: [3, -8], armR: [-2, -5], armL: [2, -5] })],
  juke: [(f) => ({ body: [-2 * f, 1], legR: [-4, 0], legL: [4, 0], armR: [-2, -3], armL: [2, -3] })],
  stiff: [(f) => ({ body: [f, 0], legR: [-1, -2], armR: [7, -6] })],
  kneel: [() => ({ body: [0, 6], legR: [-2, 0], legL: [2, 5], armR: [1, 4], armL: [0, 3] })],
};
const ORDER = ['legR', 'legL', 'body', 'armR', 'armL'];

function compose(look, view, poseName, frame, face) {
  const cut = (look.cut ||= {}), { parts, gw, gh } = cut[view] || (cut[view] = stretched(look, view));
  const cw = gw + PAD_X * 2, ch = gh + PAD_TOP + PAD_BOTTOM, px = new Array(cw * ch).fill(null);
  const book = FRONT, list = book[poseName] || (['backpedal', 'carry', 'qbdrop'].includes(poseName) ? book.run : book.stand), moves = list[frame % list.length](face);
  ORDER.forEach((name) => {
    const [dx = 0, dy = 0, flip] = moves[name] || [];
    parts[name].forEach(([x, y, c]) => {
      const yy = (flip ? 31 + 39 - y : y) + dy + PAD_TOP, xx = x + dx + PAD_X;
      if (xx >= 0 && yy >= 0 && xx < cw && yy < ch) px[yy * cw + xx] = c;
    });
  });
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {   // the dark outline, like the Drip tab art
    const k = px[y * cw + x];
    if (k) { ctx.fillStyle = k; ctx.fillRect(x, y, 1, 1); continue; }
    if ((x > 0 && px[y * cw + x - 1]) || (x < cw - 1 && px[y * cw + x + 1]) || (y > 0 && px[(y - 1) * cw + x]) || (y < ch - 1 && px[(y + 1) * cw + x])) { ctx.fillStyle = INK; ctx.fillRect(x, y, 1, 1); }
  }
  c.footX = cw / 2; c.footY = ch - PAD_BOTTOM; c.hand = [cw / 2 + 3, ch - PAD_BOTTOM - 22]; c.hand2 = c.hand;
  return c;
}

function turned(img, deg) { // lying on the turf (90) or diving (about 60)
  const r = (deg * Math.PI) / 180, w = Math.ceil(Math.abs(img.width * Math.cos(r)) + Math.abs(img.height * Math.sin(r))), h = Math.ceil(Math.abs(img.width * Math.sin(r)) + Math.abs(img.height * Math.cos(r)));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.translate(w / 2, h / 2); ctx.rotate(r); ctx.drawImage(img, -img.width / 2, -img.height / 2);
  c.footX = w / 2; c.footY = Math.abs(deg) >= 80 ? h * 0.62 : h * 0.85; c.hand = [w / 2 + 6 * Math.sign(deg), c.footY - 6]; c.hand2 = c.hand;
  return c;
}

const cache = new Map();
// look: { key, colors (the game uniform), face (portrait looks), number, drip, design, wide, tall }. view: front | back | side.
// pose: any name in fieldRig POSES (side) or FRONT (front and back), plus down and dive. face: 1 right, -1 left.
export function sprite(look, view, pose, frame, face) {
  const k = `${look.key}|${view}|${pose}|${frame}|${face}`;
  let c = cache.get(k);
  if (!c) {
    if (pose === 'down') c = turned(rigFrame(look, 'stand', 0, face), 90 * face);
    else if (pose === 'dive') c = turned(rigFrame(look, 'tackle', 0, face), 50 * face);
    else if (view === 'side') c = rigFrame(look, pose, frame, face);
    else c = compose(look, view, pose, frame, face);
    cache.set(k, c);
  }
  return c;
}
