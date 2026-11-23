// The ceremony auditorium around the stage, as pixel art on a 320x180 canvas: damask walls, a coffered gold ceiling,
// two tiers of balcony boxes with lamps and a few guests, and the dark rows of seated guests in suits up front.
export const W = 320, H = 180;

const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
export const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

// Walls and ceiling behind everything.
export function drawWalls(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#150812'); g.addColorStop(0.55, '#1f0b14'); g.addColorStop(1, '#0b0508');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let y = 12; y < 132; y += 2) for (let x = (y / 2) % 2; x < W; x += 2) {   // damask: a faint diamond dither
    const d = (Math.abs(((x + 8) % 16) - 8) + Math.abs(((y + 8) % 16) - 8));
    if (d === 6 || d === 7) rect(ctx, '#2c0f1a', x, y, 1, 1);
  }
  rect(ctx, '#0c0609', 0, 0, W, 12);   // coffered ceiling band
  for (let x = 2; x < W; x += 14) {
    rect(ctx, '#3a2a12', x, 2, 12, 8); rect(ctx, '#140c08', x + 2, 4, 8, 4);
    rect(ctx, '#8a6a2a', x, 2, 12, 1); rect(ctx, '#5a4318', x, 9, 12, 1);
  }
  rect(ctx, '#b8902f', 0, 11, W, 1); rect(ctx, '#6a4e1a', 0, 12, W, 1);
}

// One balcony box: drape on top, guests inside, a gold rail and a little lamp.
function box(ctx, x, y, w, flip) {
  rect(ctx, '#0a0407', x, y, w, 22);
  for (let i = 0; i < w; i++) {   // red drape swag across the top
    const sag = Math.round(3 * Math.sin((i / w) * Math.PI));
    rect(ctx, i % 3 === 0 ? '#5e0f19' : '#7d1522', x + i, y, 1, 3 + sag);
    rect(ctx, '#c79a3a', x + i, y + 3 + sag, 1, 1);
  }
  for (let k = 0; k < 3; k++) {   // guests: dark heads with a little warm rim light
    if (hash(x + k, y) < 0.35) continue;
    const hx = x + 4 + k * Math.floor((w - 8) / 3), hy = y + 11;
    rect(ctx, '#050203', hx, hy, 4, 4); rect(ctx, '#050203', hx - 1, hy + 4, 6, 4);
    rect(ctx, '#3b2420', flip ? hx : hx + 3, hy, 1, 2);
  }
  rect(ctx, '#3a0a12', x - 1, y + 15, w + 2, 7);   // velvet front with a gold rail and balusters
  rect(ctx, '#ffe08a', x - 1, y + 14, w + 2, 1); rect(ctx, '#c79a3a', x - 1, y + 15, w + 2, 1);
  for (let i = 1; i < w; i += 3) rect(ctx, '#7a5a1e', x + i, y + 17, 1, 4);
  rect(ctx, '#c79a3a', x - 1, y + 21, w + 2, 1);
  const lx = flip ? x + 1 : x + w - 3;
  rect(ctx, '#7a5a1e', lx, y + 6, 2, 4); rect(ctx, '#ffd27a', lx, y + 4, 2, 2);
}

export function drawBalconies(ctx) {
  for (const [y, wl] of [[28, 30], [60, 32], [92, 34]]) {
    box(ctx, 4, y, wl, false);
    box(ctx, W - 4 - wl, y, wl, true);
  }
  for (const x of [0, W - 3]) { rect(ctx, '#2a1d0a', x, 14, 3, 120); rect(ctx, '#8a6a2a', x + 1, 14, 1, 120); }   // gilded wall columns
}

// Lamp spots on the balconies (for the glow layer): [x, y].
export const LAMPS = [[28, 30], [60, 32], [92, 34]].flatMap(([y, wl]) => [[4 + wl - 2, y + 5], [W - 3 - wl, y + 5]]);

// One seated guest seen from behind: a round head over suit shoulders, the stage light catching the top edge.
function guest(ctx, cx, cy, r, k) {
  const sw = r * 2 + 3, sh = r * 2;   // shoulders
  for (let j = 0; j < sh; j++) { const half = Math.round(sw / 2 - Math.max(0, 2 - j)); rect(ctx, '#08050a', cx - half, cy + r * 2 - 1 + j, half * 2 + 1, 1); }
  rect(ctx, '#2c2026', cx - Math.round(sw / 2) + 2, cy + r * 2 - 1, sw - 3, 1);
  for (let dy = -r; dy <= r; dy++) {   // head
    const half = Math.round(Math.sqrt(r * r - dy * dy) * 0.85), y = cy + r + dy - 1;
    rect(ctx, '#0b0709', cx - half, y, half * 2 + 1, 1);
    if (dy === -r || dy === -r + 1) rect(ctx, dy === -r ? '#8a6650' : '#3e2c2a', cx - half, y, half * 2 + 1, 1);
    else if (dy < 0 && k > 1) { rect(ctx, '#4a3430', cx - half, y, 1, 1); rect(ctx, '#2a1e20', cx + half, y, 1, 1); }
  }
}

// The guests in the front rows: suits in the dark, the nearest rows bigger. Returns each head (for clapping hands later).
export function drawAudience(ctx) {
  const g = ctx.createLinearGradient(0, 132, 0, H);
  g.addColorStop(0, '#120709'); g.addColorStop(1, '#030102');
  ctx.fillStyle = g; ctx.fillRect(0, 136, W, H - 136);
  const heads = [];
  const rows = [[142, 3, 9], [150, 4, 11], [159, 5, 13], [169, 6, 15], [180, 8, 19]];
  rows.forEach(([y, r, step], k) => {
    const shade = ['#2a0c12', '#250a10', '#1f080d', '#18060a', '#100407'][k];
    for (let x = -step; x < W + step; x += step) rect(ctx, shade, x + 1, y - r + 1, step - 2, r + 4);   // seat backs
    rect(ctx, '#3a1018', 0, y - r + 1, W, 1);
    const off = (k % 2) * (step / 2);
    for (let x = off; x < W + step; x += step) {
      if (hash(x, k) < 0.12) continue;   // an empty seat here and there
      const hx = Math.round(x + (hash(k, x) - 0.5) * 3), hy = y - r * 2 - 1;
      guest(ctx, hx, hy, r, k);
      heads.push({ x: hx, y: hy, r, k });
    }
  });
  return heads;
}
