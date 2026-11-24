// The ceremony's audience, alive: five rows of guests in suits seen from behind (each a cached sprite: hair, ears,
// collar, the stage light on their heads). About a quarter of the seats start empty and fill in over the first two
// minutes or so as people walk along the rows; now and then someone stands up for a few seconds; at the end about a
// third leave during the winners card and everyone else during the last slide. T: seconds since the show opened.
import { W, rect, hash } from './stageHouse.js';

const ROWS = [[142, 3, 9], [150, 4, 11], [159, 5, 13], [169, 6, 15], [180, 8, 19]];
const BACKS = ['#2a0c12', '#250a10', '#1f080d', '#18060a', '#100407'];
const HAIR = ['#0c0807', '#140e0a', '#1e140e', '#2a1a10', '#3a2614', '#4a4a50', '#2a120a', '#5a4a30', '#100c0c', '#1a1210'];
const SUIT = ['#08070c', '#0c1020', '#121014', '#0a0c0a', '#140a10'];
const lift = (hex) => hex.replace(/^#(..)(..)(..)$/, (m, a, b, c) => `#${[a, b, c].map((v) => Math.min(255, parseInt(v, 16) + 40).toString(16).padStart(2, '0')).join('')}`);

function guest(ctx, cx, cy, r, n) {   // one guest from behind, head top at cy
  const hair = HAIR[n % HAIR.length], suit = SUIT[(n * 7) % SUIT.length], long = hash(n, 3) < 0.3, sw = r * 2 + 3;
  for (let j = 0; j < r * 2; j += 0.5) { const half = sw / 2 - Math.max(0, 1.5 - j) * 0.8; rect(ctx, suit, cx - half, cy + r * 2 - 0.5 + j, half * 2, 0.5); }
  rect(ctx, '#2c2430', cx - sw / 2 + 1.5, cy + r * 2 - 0.5, sw - 3, 0.5);
  rect(ctx, '#000', cx - 0.25, cy + r * 2 + 1, 0.5, r * 1.5);
  rect(ctx, '#6a4c3c', cx - r * 0.35, cy + r * 1.6, r * 0.7, r * 0.5);
  rect(ctx, '#d8d8e0', cx - r * 0.45, cy + r * 2 - 0.5, r * 0.9, 0.5);
  for (let dy = -r; dy <= r; dy += 0.5) {
    const half = Math.max(0.5, Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) * 0.85 * 2) / 2), y = cy + r + dy - 1;
    rect(ctx, hair, cx - half, y, half * 2, 0.5);
    if (dy <= -r + 0.5) rect(ctx, '#5e4636', cx - half, y, half * 2, 0.5);
    else if (dy <= -r + 1.5) rect(ctx, lift(hair), cx - half + 0.5, y, half * 2 - 1, 0.5);
    if ((dy * 2) % 2 === 0 && dy > -r + 1) rect(ctx, '#00000033', cx - half + ((dy * 3) % 2), y, 0.5, 0.5);
  }
  rect(ctx, '#7a5444', cx - r * 0.85 - 0.5, cy + r - 0.5, 0.5, 1); rect(ctx, '#7a5444', cx + r * 0.85, cy + r - 0.5, 0.5, 1);
  if (long) for (let j = 0; j < r * 1.6; j += 0.5) rect(ctx, hair, cx - r * 0.8, cy + r + j, r * 1.6, 0.5);
  return suit;
}

// Every seat and its guest's sprite (drawn once, at twice the world's resolution).
export function buildAudience() {
  const rows = ROWS.map(([y, r, step], k) => {
    const c = document.createElement('canvas'); c.width = W * 2; c.height = (r + 6) * 2;   // this row's seat backs
    const g = c.getContext('2d'); g.scale(2, 2); g.translate(0, -(y - r + 1));
    for (let x = -step; x < W + step; x += step) { rect(g, BACKS[k], x + 1, y - r + 1, step - 2, r + 4); rect(g, '#4a1420', x + 1, y - r + 1, step - 2, 0.5); }
    const seats = [];
    for (let x = (k % 2) * (step / 2); x < W + step; x += step) {
      if (hash(x, k) < 0.03) continue;   // a few seats stay empty all night
      const cx = Math.round((x + (hash(k, x) - 0.5) * 3) * 2) / 2, cy = y - r * 2 - 1, n = Math.floor(hash(x, k + 9) * 97), sw = r * 2 + 3;
      const s = document.createElement('canvas'); s.width = (sw + 2) * 2; s.height = (r * 4 + 2) * 2;
      const sg = s.getContext('2d'); sg.scale(2, 2); sg.translate(-(cx - sw / 2 - 1), -cy);
      const suit = guest(sg, cx, cy, r, n), late = hash(n + x, 5) < 0.26;
      seats.push({ x: cx, y: cy, r, k, n, img: s, ox: cx - sw / 2 - 1, w: s.width / 2, h: s.height / 2, suit,
        arrive: late ? 3 + hash(n, x + 6) * 120 : 0, early: hash(n, x + 7) < 0.3, q: hash(n, x + 8) });
    }
    return { y, r, back: c, top: y - r + 1, seats };
  });
  return { rows };
}

const ease = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

// Where a guest is at time T: { x, up (0 seated .. 1 standing), walking, here }. leave: { F, C } (when the winners card
// and the last slide were first reached).
function stateOf(s, T, leave) {
  const edge = s.x < 160 ? -14 : W + 14, inDur = Math.abs(s.x - edge) / 24, outDur = Math.abs(s.x - edge) / 34;
  let out = null;
  if (s.early && leave.F != null) out = leave.F + 2 + s.q * 26;
  else if (!s.early && leave.C != null) out = leave.C + 1 + s.q * 200;
  if (s.arrive && T < s.arrive) {
    const k = (T - (s.arrive - inDur)) / inDur;
    if (k < 0) return { here: false };
    return { here: true, x: edge + (s.x - edge) * k, up: 1, walking: true };
  }
  if (out != null && T > out) {
    const k = (T - out - 0.5) / outDur;
    if (k >= 1) return { here: false };
    return { here: true, x: s.x + (edge - s.x) * Math.max(0, k), up: ease((T - out) / 0.5), walking: k > 0 };
  }
  const settle = s.arrive ? ease(1 - (T - s.arrive) / 0.5) : 0, bucket = Math.floor(T / 18), stand = hash(s.n + s.x, bucket) < 0.006;   // now and then someone stands
  const u = T - bucket * 18 - 4, standUp = stand && u > 0 && u < 6 ? ease(u / 0.6) * ease((6 - u) / 0.6) : 0;
  return { here: true, x: s.x, up: Math.max(settle, standUp), walking: false };
}

// Draws the rows and their guests, plus clapping hands. clap 0..1. t: the slide clock (the hands' rhythm).
export function drawAudienceFrame(ctx, aud, T, leave, t, clap) {
  aud.rows.forEach((row) => {
    ctx.drawImage(row.back, 0, row.top, W, row.back.height / 2);
    const here = row.seats.map((s) => [s, stateOf(s, T, leave)]).filter(([, st]) => st.here);
    [...here.filter(([, st]) => !st.walking), ...here.filter(([, st]) => st.walking)].forEach(([s, st]) => {   // people walking pass in front
      const raise = st.up * s.r * 1.4, bob = st.walking ? Math.abs(Math.sin(T * 8 + s.n)) * 0.5 : 0, dx = st.x - s.x;
      if (raise > 0.2) rect(ctx, s.suit, s.ox + dx + 1.5, s.y + s.r * 4 - raise - bob, s.w - 3, raise);   // the body, once he's up
      ctx.drawImage(s.img, s.ox + dx, s.y - raise - bob, s.w, s.h);
      if (clap > 0 && st.up < 0.1 && s.k >= 1 && s.q < clap * 0.7) {   // hands coming together
        const r = s.r, sep = r * 0.12 + r * 0.38 * (0.5 + 0.5 * Math.sin(t * 13 + s.n * 2.3)), y = s.y - r * 0.9 + Math.sin(t * 13 + s.n) * 0.4, sz = Math.max(1.2, r * 0.42);
        for (const d of [-sep, sep]) { const hx = s.x + d - sz / 2 + r * 0.5; rect(ctx, '#6e5040', hx, y, sz, sz * 1.4); rect(ctx, '#d8aa80', hx, y, sz, Math.min(1, sz * 0.4)); rect(ctx, '#0c0810', hx, y + sz * 1.4, sz, sz); }
      }
    });
  });
}
