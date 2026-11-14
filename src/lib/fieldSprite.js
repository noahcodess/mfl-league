// The on-field player: his real drip sprite (the same one coaches see in the Drip tab, with his face, number, helmet and gear),
// cut into body, two arms and two legs so each pose can move them. Big men are drawn wider and tall men get longer legs.
// Every pose is drawn once per player and reused, so a full game costs almost nothing.
import { uniformPixels, W, H, INK } from './uniformDraw.js';

const PAD_X = 10, PAD_TOP = 26, PAD_BOTTOM = 2;

// wide: extra pixels on each side of his body (0 slim, 1 average, 2 big, 3 huge). tall: extra pixels of leg (0 to 2).
export function buildOf(p) {
  const h = p.height || 73, w = p.weight || 215, bmi = (w / (h * h)) * 703;
  return { wide: bmi < 26.5 ? 0 : bmi < 30 ? 1 : bmi < 34 ? 2 : 3, tall: h >= 77 ? 2 : h >= 74 ? 1 : 0 };
}

// Stretches the drip sprite for his build and cuts it into parts: { body, armR, armL, legR, legL } as [x, y, color] lists.
function partsOf(look) {
  const src = uniformPixels(look.colors, look.face, look.number, { drip: look.drip, design: look.design });
  const w = look.wide, t = look.tall, parts = { body: [], armR: [], armL: [], legR: [], legL: [] };
  const put = (x, y, c) => {
    const part = y >= 41 ? (x <= 15 + w ? 'legR' : 'legL') : y >= 31 && y <= 39 && x <= 6 ? 'armR' : y >= 31 && y <= 39 && x >= 25 + 2 * w ? 'armL' : 'body';
    parts[part].push([x, y, c]);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = src.get(x, y); if (!c) continue;
    const ys = y < 46 ? [y] : [y + t], extra = y === 45 ? Array.from({ length: t }, (_, i) => 46 + i) : [];
    [...ys, ...extra].forEach((yy) => {
      if (y < 23) { put(x + w, yy, c); return; }                       // helmet and face stay centered
      if (x < 8) put(x, yy, c); else if (x === 8) for (let i = 0; i <= w; i++) put(8 + i, yy, c);
      else if (x < 23) put(x + w, yy, c); else if (x === 23) for (let i = 0; i <= w; i++) put(23 + w + i, yy, c); else put(x + 2 * w, yy, c);
    });
  }
  return { parts, gw: W + 2 * w, gh: H + t };
}

// How each part moves in each pose: [dx, dy, flipped]. A flipped arm points up (hand above the shoulder). f: 1 facing right, -1 left.
const UP_R = (dx, dy) => [dx, dy, true], UP_L = UP_R;
const POSES = {
  stand: [() => ({})],
  set: [() => ({ body: [0, 4], legR: [-2, 0], legL: [2, 0], armR: [2, 9], armL: [0, 5] })],
  run: [
    (f) => ({ body: [f, 0], legR: [-1, -3], legL: [1, 0], armR: [0, 2], armL: [0, -2] }),
    (f) => ({ body: [f, 1], legR: [0, -1], legL: [0, 0], armR: [0, 0], armL: [0, 0] }),
    (f) => ({ body: [f, 0], legR: [-1, 0], legL: [1, -3], armR: [0, -2], armL: [0, 2] }),
    (f) => ({ body: [f, 1], legR: [0, 0], legL: [0, -1], armR: [0, 0], armL: [0, 0] }),
  ],
  block: [
    (f) => ({ body: [f, 2], legR: [-2, 0], legL: [2, 0], armR: [5, -2], armL: [-5, -2] }),
    (f) => ({ body: [2 * f, 2], legR: [-3, 0], legL: [2, -1], armR: [6, -3], armL: [-6, -3] }),
  ],
  throw: [
    (f) => ({ body: [-f, 0], legR: [-2, 0], legL: [2, 0], armR: UP_R(0, -17), armL: [3, -3] }),
    (f) => ({ body: [f, 1], legR: [-2, 0], legL: [2, -1], armR: [5, -9], armL: [-1, 1] }),
  ],
  catch: [() => ({ body: [0, -2], legR: [0, -2], legL: [0, -3], armR: UP_R(3, -24), armL: UP_L(-3, -24) })],
  cheer: [
    () => ({ armR: UP_R(0, -21), armL: UP_L(0, -21) }),
    () => ({ body: [0, -2], legR: [0, -2], legL: [0, -2], armR: UP_R(-1, -24), armL: UP_L(1, -24) }),
  ],
  kick: [(f) => ({ body: [-f, 0], legR: [3, -8], armR: [-2, -5], armL: [2, -5] })],
};
const ORDER = ['legR', 'legL', 'body', 'armR', 'armL'];

function compose(look, poseName, frame, face) {
  const { parts, gw, gh } = look.cut || (look.cut = partsOf(look));
  const cw = gw + PAD_X * 2, ch = gh + PAD_TOP + PAD_BOTTOM, px = new Array(cw * ch).fill(null);
  const list = POSES[poseName] || POSES.stand, moves = list[frame % list.length](face);
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
  c.footX = cw / 2; c.footY = ch - PAD_BOTTOM;
  return c;
}

function turned(img, deg) { // lying on the turf (90) or diving (about 60)
  const r = (deg * Math.PI) / 180, w = Math.ceil(Math.abs(img.width * Math.cos(r)) + Math.abs(img.height * Math.sin(r))), h = Math.ceil(Math.abs(img.width * Math.sin(r)) + Math.abs(img.height * Math.cos(r)));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.translate(w / 2, h / 2); ctx.rotate(r); ctx.drawImage(img, -img.width / 2, -img.height / 2);
  c.footX = w / 2; c.footY = Math.abs(deg) >= 80 ? h * 0.62 : h * 0.85;
  return c;
}

const cache = new Map();
// look: { key, colors (the game uniform), face (portrait looks), number, drip, design, wide, tall }.
// pose: stand, set, run, block, throw, catch, cheer, kick, down, dive. face: 1 right, -1 left. Returns a canvas with footX/footY.
export function sprite(look, pose, frame, face) {
  const k = `${look.key}|${pose}|${frame}|${face}`;
  let c = cache.get(k);
  if (!c) {
    if (pose === 'down') c = turned(compose(look, 'stand', 0, face), 90 * face);
    else if (pose === 'dive') c = turned(compose(look, 'run', 0, face), 62 * face);
    else c = compose(look, pose, frame, face);
    cache.set(k, c);
  }
  return c;
}
