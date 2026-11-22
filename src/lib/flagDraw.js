// The yellow penalty flag in pixel art, with the dark outline the players have. In the air the weighted knot leads and
// the cloth streams out behind it, rippling (it trails back while it climbs, then floats up over the knot as it drifts
// down); its shadow tracks it on the grass. On the ground it lies in a crumpled heap with the knot in the middle.
import { INK } from './uniformDraw.js';

const Y = '#ffd21a', YH = '#fff07a', YS = '#d6a300', YD = '#a87b00', KNOT = '#8a6400', N = 25, C = 12;
const PAL = { Y, H: YH, S: YS, D: YD, K: KNOT };
// Four frames of the cloth rippling out behind the knot (K), hand-drawn like the rest of the field art.
const WAVE = [
  ['....HYY...', '.KDHYYYS..', 'KKDYYHYYS.', '.KDYYYYS..', '....SYS...'],
  ['.....HY...', '.KDHYYYYS.', 'KKDYYHYY..', '.KDYYYYYS.', '.....SS...'],
  ['....HYYS..', '.KDHYYY...', 'KKDYYHYYS.', '.KDYYYS...', '...SYYS...'],
  ['.....HYS..', '.KDHYYYYS.', 'KKDYHYYY..', '.KDYYYYS..', '....SYYS..'],
];

// Paints the little pixel grid (N x N, its middle at the flag's spot) onto the screen, outlined.
function blit(ctx, X, Y0, sp, px) {
  const s = Math.max(1, sp);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = px[y * N + x];
    const edge = !c && ((x > 0 && px[y * N + x - 1]) || (x < N - 1 && px[y * N + x + 1]) || (y > 0 && px[(y - 1) * N + x]) || (y < N - 1 && px[(y + 1) * N + x]));
    if (!c && !edge) continue;
    ctx.fillStyle = c || INK; ctx.fillRect(Math.round(X + (x - C) * s), Math.round(Y0 + (y - C) * s), Math.ceil(s), Math.ceil(s));
  }
}

// f: { landed, vx, vh (screen-ish velocity: + right, + up), age (seconds in the air) }. X, Y: its spot on screen. sp: screen px per sprite px.
export function drawFlag(ctx, X, Y0, sp, f) {
  const px = new Array(N * N).fill(null), put = (x, y, c) => { x = Math.round(x) + C; y = Math.round(y) + C; if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = c; };
  if (f.landed) {   // lying in a heap on the grass
    [[-3, -1, 3, YS], [-4, 0, 4, Y], [-3, 1, 4, Y], [-2, 2, 2, YS]].forEach(([a, y, b, c]) => { for (let x = a; x <= b; x++) put(x, y, c); });
    put(-2, 0, YH); put(-1, 0, YH); put(2, 1, YD); put(3, 1, YD); put(0, 0, KNOT); put(1, 0, KNOT); put(0, 1, YD);
    blit(ctx, X, Y0, sp, px); return;
  }
  const k = Math.floor(f.age * 11) % 4, rows = WAVE[k], dir = f.vh < -0.3 && Math.abs(f.vx) < Math.abs(f.vh) * 2.2 ? 'up' : f.vx >= 0 ? 'left' : 'right';
  rows.forEach((r, y) => [...r].forEach((ch, x) => {   // drawn streaming to the right of the knot; turned to stream behind it or up over it
    const c = PAL[ch]; if (!c) return;
    const lx = x - 1, ly = y - 2;   // the knot sits at (1, 2)
    if (dir === 'right') put(lx, ly, c); else if (dir === 'left') put(-lx, ly, c); else put(ly, -lx, c);
  }));
  blit(ctx, X, Y0, sp, px);
}

// Its shadow on the grass while it's up (smaller and fainter the higher it is).
export function drawFlagShadow(ctx, X, Y0, sp, h) {
  const k = Math.max(0.35, 1 - h / 6), w = 7 * sp * k, hh = 2.2 * sp * k;
  ctx.fillStyle = `rgba(0,0,0,${(0.3 * k).toFixed(2)})`; ctx.fillRect(Math.round(X - w / 2), Math.round(Y0 - hh / 2), Math.round(w), Math.max(1, Math.round(hh)));
}
