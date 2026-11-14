// The on-field player sprite: a small side-view pixel player in the same chunky style as the field, drawn once per look and
// pose and then reused (so a whole game of them costs nothing). His build comes from his real height and weight: a
// 330-pound tackle is wide, a 190-pound receiver is slim, tall players have longer legs.
import { shade } from './pixels.js';

export const SW = 24, SH = 32, FOOT_X = 12, FOOT_Y = 30;
const OUT = '#141018', MASK = '#c9ced6', CLEAT = '#1b1b20', GLOVE = '#f2f2f2';

// 0 slim, 1 average, 2 heavy; and 0 to 2 extra pixels of leg for tall players.
export function buildOf(p) {
  const h = p.height || 73, w = p.weight || 215, bmi = (w / (h * h)) * 703;
  return { wide: bmi < 27.5 ? 0 : bmi < 32.5 ? 1 : 2, tall: h >= 77 ? 2 : h >= 73 ? 1 : 0 };
}

// Where the feet and hands are in each pose: [forward, down] from the hip (feet) or shoulder (hands). L = leg length.
const POSES = {
  stand: [() => ({ f: [[1, 0], [-2, 0]], h: [[2, 7], [-2, 7]] })],
  set: [() => ({ crouch: 3, lean: 2, f: [[3, 0], [-4, 0]], h: [[5, 9], [1, 6]] })],
  run: [
    () => ({ lean: 1, f: [[5, -2], [-5, -1]], h: [[-3, 4], [4, 3]] }), () => ({ lean: 1, bob: 1, f: [[1, 0], [-1, -3]], h: [[0, 6], [1, 6]] }),
    () => ({ lean: 1, f: [[-5, -1], [5, -2]], h: [[4, 3], [-3, 4]] }), () => ({ lean: 1, bob: 1, f: [[-1, -3], [1, 0]], h: [[1, 6], [0, 6]] }),
  ],
  block: [() => ({ crouch: 1, lean: 1, f: [[3, 0], [-4, 0]], h: [[6, 1], [5, 2]] }), () => ({ crouch: 1, lean: 2, f: [[4, 0], [-3, 0]], h: [[7, 0], [6, 2]] })],
  throw: [() => ({ f: [[3, 0], [-3, 0]], h: [[-4, -4], [4, 2]] }), () => ({ lean: 1, f: [[4, 0], [-3, 0]], h: [[6, -3], [-2, 5]] })],
  catch: [() => ({ bob: 1, f: [[2, 0], [-3, -1]], h: [[5, -5], [4, -4]] })],
  cheer: [() => ({ f: [[2, 0], [-2, 0]], h: [[3, -8], [-3, -8]] }), () => ({ bob: 2, f: [[2, 0], [-2, 0]], h: [[4, -7], [-4, -7]] })],
  kick: [() => ({ lean: -1, f: [[7, -5], [-1, 0]], h: [[-3, 3], [3, 3]] })],
};

function limb(px, x0, y0, x1, y1, colorAt) { // a 2-pixel-thick line; colorAt(0..1) picks the color along it
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n), c = colorAt(i / n); px(x, y, c); px(x + 1, y, c); }
}

function paint(look, pose, frame) {
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  const ctx = c.getContext('2d'), px = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }, box = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const { wide, tall } = look, L = 8 + tall, hw = 3 + wide, sock = look.trim, jLo = shade(look.jersey, 0.72);
  if (pose === 'down') { // flat on the turf
    box(4, FOOT_Y - 5, 9 + wide, 5, look.jersey); box(13 + wide, FOOT_Y - 4, 6, 4, look.pants); box(19 + wide, FOOT_Y - 3, 2, 3, sock); box(0, FOOT_Y - 6, 5, 6, look.helmet); box(0, FOOT_Y - 3, 2, 2, MASK);
  } else {
    const P = (POSES[pose] || POSES.stand), s = P[frame % P.length](), crouch = s.crouch || 0, lean = s.lean || 0, bob = s.bob || 0;
    const hipY = FOOT_Y - L + crouch - bob, shY = hipY - 8 + Math.min(crouch, 2), cx = FOOT_X, tx = cx + lean, legC = (t) => (t < 0.55 ? look.pants : t < 0.85 ? sock : CLEAT), armC = (t) => (t < 0.4 ? look.jersey : t < 0.85 ? look.skin : GLOVE);
    const foot = ([dx, dy]) => [cx + dx, Math.min(FOOT_Y, hipY + L - crouch + dy + bob)], hand = ([dx, dy]) => [tx + dx, shY + 1 + dy];
    limb(px, tx - 1, shY + 1, ...hand(s.h[1]), (t) => shade(armC(t), 0.75)); limb(px, cx - 1, hipY, ...foot(s.f[1]), (t) => shade(legC(t), 0.75));   // far side first
    box(tx - hw, shY, hw * 2, hipY - shY, look.jersey); box(tx - hw, shY, 1, hipY - shY, jLo); box(tx - hw, shY, hw * 2, 1, shade(look.jersey, 1.2));   // torso
    box(tx - hw + 1, hipY - 1, hw * 2 - 2, 2, look.pants); if (hw > 3) box(tx - 1, shY + 2, 3, 3, look.numbers);                                        // belt, number patch
    const hx = tx - 3 + Math.min(lean, 1), hy = shY - 6;
    box(hx, hy, 7, 6, look.helmet); box(hx, hy + 5, 7, 1, shade(look.helmet, 0.7)); box(hx + 2, hy, 3, 1, look.trim); box(hx + 5, hy + 2, 2, 2, look.skin); box(hx + 6, hy + 3, 2, 3, MASK); px(hx + 1, hy + 1, shade(look.helmet, 1.4));
    limb(px, cx, hipY, ...foot(s.f[0]), legC); limb(px, tx, shY + 1, ...hand(s.h[0]), armC);
  }
  const img = ctx.getImageData(0, 0, SW, SH), d = img.data, solid = (x, y) => x >= 0 && y >= 0 && x < SW && y < SH && d[(y * SW + x) * 4 + 3] > 0, edge = [];
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edge.push([x, y]);
  edge.forEach(([x, y]) => px(x, y, OUT));
  return c;
}

const cache = new Map();
// look: { key, jersey, pants, numbers, trim, helmet, skin, wide, tall }. face: 1 right, -1 left.
export function sprite(look, pose, frame, face) {
  const k = `${look.key}|${pose}|${frame}|${face}`;
  let c = cache.get(k);
  if (!c) {
    c = paint(look, pose, frame);
    if (face < 0) { const f = document.createElement('canvas'); f.width = SW; f.height = SH; const x = f.getContext('2d'); x.translate(SW, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); c = f; }
    cache.set(k, c);
  }
  return c;
}
