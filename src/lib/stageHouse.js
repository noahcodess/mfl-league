// The ceremony auditorium around the stage, as pixel art. Coordinates are in a 320x180 world but the canvas is twice that,
// so details can sit on half-units: damask walls, a coffered gold ceiling, three tiers of balcony boxes with lamps and
// guests, and the rows of guests in suits seen from behind (hair, ears, collars, the stage light on their heads).
export const W = 320, H = 180;

export const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
export const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

export function drawWalls(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#150812'); g.addColorStop(0.55, '#1f0b14'); g.addColorStop(1, '#0b0508');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let y = 12; y < 132; y += 1) for (let x = (y % 2) * 0.5; x < W; x += 1) {   // damask: a fine diamond dither
    const d = (Math.abs(((x + 8) % 16) - 8) + Math.abs(((y + 8) % 16) - 8));
    if (d > 5.5 && d < 7) rect(ctx, '#2c0f1a', x, y, 0.5, 0.5);
    if (d < 1) rect(ctx, '#3a1422', x, y, 0.5, 0.5);
  }
  rect(ctx, '#0c0609', 0, 0, W, 12);   // coffered ceiling with gold rosettes
  for (let x = 2; x < W; x += 14) {
    rect(ctx, '#3a2a12', x, 2, 12, 8); rect(ctx, '#140c08', x + 2, 4, 8, 4);
    rect(ctx, '#8a6a2a', x, 2, 12, 0.5); rect(ctx, '#5a4318', x, 9.5, 12, 0.5);
    rect(ctx, '#c79a3a', x + 5.5, 5.5, 1, 1); rect(ctx, '#7a5a1e', x + 5, 5.5, 0.5, 1); rect(ctx, '#7a5a1e', x + 6.5, 5.5, 0.5, 1);
  }
  rect(ctx, '#b8902f', 0, 11, W, 1); rect(ctx, '#fff0b0', 0, 11, W, 0.5); rect(ctx, '#6a4e1a', 0, 12, W, 1);
}

// A small balcony guest seen from the side of the box.
function boxGuest(ctx, x, y, n) {
  const hair = ['#1a1210', '#3a2616', '#6a4a2a', '#8a8a8a'][n % 4];
  rect(ctx, '#060305', x - 1, y + 4, 6, 4); rect(ctx, '#d6d6de', x + 1.5, y + 4, 1, 0.5);   // shoulders, a collar
  rect(ctx, hair, x, y, 4, 4); rect(ctx, '#7a5a48', x + (n % 2 ? 0 : 3.5), y + 1.5, 0.5, 1); rect(ctx, '#3b2420', x, y, 4, 0.5);
}

function box(ctx, x, y, w, flip) {
  rect(ctx, '#0a0407', x, y, w, 22);
  for (let i = 0; i < w; i += 0.5) {   // red drape swag across the top, with folds and a gold fringe
    const sag = 3 * Math.sin((i / w) * Math.PI), f = Math.sin(i * 2.1);
    rect(ctx, f > 0.4 ? '#9a1d2a' : f > -0.4 ? '#7d1522' : '#5e0f19', x + i, y, 0.5, 3 + sag);
    rect(ctx, (i * 2) % 2 ? '#e9c368' : '#c79a3a', x + i, y + 3 + sag, 0.5, 0.5);
    if ((i * 2) % 3 === 0) rect(ctx, '#8a6a2a', x + i, y + 3.5 + sag, 0.5, 1);
  }
  for (let k = 0; k < 3; k++) if (hash(x + k, y) > 0.3) boxGuest(ctx, x + 4 + k * Math.floor((w - 8) / 3), y + 10, Math.floor(hash(k, y) * 8));
  rect(ctx, '#3a0a12', x - 1, y + 15, w + 2, 7);   // velvet front, gold rail and balusters
  rect(ctx, '#ffe08a', x - 1, y + 14, w + 2, 0.5); rect(ctx, '#c79a3a', x - 1, y + 14.5, w + 2, 1); rect(ctx, '#7a5a1e', x - 1, y + 15.5, w + 2, 0.5);
  for (let i = 1; i < w; i += 2) { rect(ctx, '#8a6a2a', x + i, y + 16.5, 0.5, 4); rect(ctx, '#e9c368', x + i, y + 16.5, 0.5, 0.5); }
  rect(ctx, '#c79a3a', x - 1, y + 21, w + 2, 1); rect(ctx, '#ffe08a', x - 1, y + 21, w + 2, 0.5);
  const lx = flip ? x + 1 : x + w - 3;   // a wall lamp with a fringed shade
  rect(ctx, '#7a5a1e', lx + 0.5, y + 7, 1, 4); rect(ctx, '#e8b860', lx - 0.5, y + 4.5, 3, 2); rect(ctx, '#fff0b0', lx, y + 5, 2, 0.5); rect(ctx, '#8a5a20', lx - 0.5, y + 6.5, 3, 0.5);
}

export function drawBalconies(ctx) {
  for (const [y, wl] of [[28, 30], [60, 32], [92, 34]]) { box(ctx, 4, y, wl, false); box(ctx, W - 4 - wl, y, wl, true); }
  for (const x of [0, W - 3]) { rect(ctx, '#2a1d0a', x, 14, 3, 120); rect(ctx, '#8a6a2a', x + 1, 14, 1, 120); rect(ctx, '#e9c368', x + 1, 14, 0.5, 120); }
}

// Lamp spots on the balconies (for the light): [x, y].
export const LAMPS = [[28, 30], [60, 32], [92, 34]].flatMap(([y, wl]) => [[4 + wl - 2, y + 5.5], [W - 3 - wl, y + 5.5]]);

const HAIR = ['#0c0807', '#140e0a', '#1e140e', '#2a1a10', '#3a2614', '#4a4a50', '#2a120a', '#5a4a30', '#100c0c', '#1a1210'];
const SUIT = ['#08070c', '#0c1020', '#121014', '#0a0c0a', '#140a10'];

// One guest seen from behind: suit shoulders with a collar line, neck, ears, hair (some long), the stage light on top.
function guest(ctx, cx, cy, r, n) {
  const hair = HAIR[n % HAIR.length], suit = SUIT[(n * 7) % SUIT.length], long = hash(n, 3) < 0.3, sw = r * 2 + 3;
  for (let j = 0; j < r * 2; j += 0.5) { const half = sw / 2 - Math.max(0, 1.5 - j) * 0.8; rect(ctx, suit, cx - half, cy + r * 2 - 0.5 + j, half * 2, 0.5); }
  rect(ctx, '#2c2430', cx - sw / 2 + 1.5, cy + r * 2 - 0.5, sw - 3, 0.5);   // light across the shoulders
  rect(ctx, '#000', cx - 0.25, cy + r * 2 + 1, 0.5, r * 1.5);   // the suit's back seam
  rect(ctx, '#6a4c3c', cx - r * 0.35, cy + r * 1.6, r * 0.7, r * 0.5);   // neck
  rect(ctx, '#d8d8e0', cx - r * 0.45, cy + r * 2 - 0.5, r * 0.9, 0.5);   // shirt collar
  for (let dy = -r; dy <= r; dy += 0.5) {   // head (hair from behind)
    const half = Math.max(0.5, Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) * 0.85 * 2) / 2), y = cy + r + dy - 1;
    rect(ctx, hair, cx - half, y, half * 2, 0.5);
    if (dy <= -r + 0.5) rect(ctx, '#5e4636', cx - half, y, half * 2, 0.5);
    else if (dy <= -r + 1.5) rect(ctx, shade(hair), cx - half + 0.5, y, half * 2 - 1, 0.5);
    if ((dy * 2) % 2 === 0 && dy > -r + 1) rect(ctx, '#00000033', cx - half + ((dy * 3) % 2), y, 0.5, 0.5);   // hair texture
  }
  rect(ctx, '#7a5444', cx - r * 0.85 - 0.5, cy + r - 0.5, 0.5, 1); rect(ctx, '#7a5444', cx + r * 0.85, cy + r - 0.5, 0.5, 1);   // ears
  if (long) for (let j = 0; j < r * 1.6; j += 0.5) rect(ctx, hair, cx - r * 0.8, cy + r + j, r * 1.6, 0.5);   // long hair over the shoulders
}
const shade = (hex) => `${hex}`.replace(/^#(..)(..)(..)$/, (m, a, b, c) => `#${[a, b, c].map((v) => Math.min(255, parseInt(v, 16) + 40).toString(16).padStart(2, '0')).join('')}`);

// The guests in the front rows (the nearest rows bigger). Returns each head (for the clapping hands).
export function drawAudience(ctx) {
  const g = ctx.createLinearGradient(0, 132, 0, H);
  g.addColorStop(0, '#120709'); g.addColorStop(1, '#030102');
  ctx.fillStyle = g; ctx.fillRect(0, 136, W, H - 136);
  const heads = [];
  [[142, 3, 9], [150, 4, 11], [159, 5, 13], [169, 6, 15], [180, 8, 19]].forEach(([y, r, step], k) => {
    const back = ['#2a0c12', '#250a10', '#1f080d', '#18060a', '#100407'][k];
    for (let x = -step; x < W + step; x += step) { rect(ctx, back, x + 1, y - r + 1, step - 2, r + 4); rect(ctx, '#4a1420', x + 1, y - r + 1, step - 2, 0.5); }   // seat backs
    const off = (k % 2) * (step / 2);
    for (let x = off; x < W + step; x += step) {
      if (hash(x, k) < 0.1) continue;   // an empty seat here and there
      const hx = Math.round((x + (hash(k, x) - 0.5) * 3) * 2) / 2, hy = y - r * 2 - 1;
      guest(ctx, hx, hy, r, Math.floor(hash(x, k + 9) * 97));
      heads.push({ x: hx, y: hy, r, k });
    }
  });
  return heads;
}
