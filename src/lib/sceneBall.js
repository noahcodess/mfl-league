// The football: pointed ends, laces and a highlight, turned to point the way it's flying. Passes spiral (the laces flash),
// kicks tumble end over end, deflections and throws made while getting hit wobble like a duck, a loose ball tumbles as it
// bounces, a shadow on the grass shows where it is over the field, and a short trail shows the path of a throw.
const ART = ['...OOOOO...', '.OOHHBBBOO.', 'OBHHBWBWBBO', 'OBBWWWWWBBO', 'OBBBBWBWBDO', '.OODDDDDOO.', '...OOOOO...'];
const BROWN = { O: '#1a0f08', B: '#8b4a1f', H: '#b8692f', W: '#f4f1e8', D: '#6b3614' };
const GOLD = { O: '#3d2a00', B: '#d9a514', H: '#ffe773', W: '#fffbe6', D: '#9c7208' };   // the Craft Bowl's gold ball
let COL = BROWN, style = 'brown';
const cache = new Map();
// 'gold' for the Craft Bowl, 'brown' for every other game (the game sets it when it starts).
export function setBallStyle(next) { if (next === style) return; style = next; COL = next === 'gold' ? GOLD : BROWN; cache.clear(); }

function art(spin) {
  const c = document.createElement('canvas'); c.width = 11; c.height = 7; const x = c.getContext('2d');
  ART.forEach((row, y) => [...row].forEach((ch, i) => { if (ch === '.') return; x.fillStyle = COL[spin && ch === 'W' ? 'B' : ch]; x.fillRect(i, y, 1, 1); }));
  return c;
}
// The ball turned to one of 16 headings (and laces showing or not), drawn once and reused.
function turned(step, spin) {
  const k = `${step}|${spin}`; if (cache.has(k)) return cache.get(k);
  const c = document.createElement('canvas'); c.width = 15; c.height = 15; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.translate(7.5, 7.5); x.rotate((step * Math.PI) / 8); x.drawImage(art(spin), -5.5, -3.5);
  cache.set(k, c); return c;
}
const stepOf = (ang) => ((Math.round(ang / (Math.PI / 8)) % 16) + 16) % 16;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// Where the ball sits in his hands: between both hands for a two-handed catch, in his near hand otherwise.
const TWO = new Set(['hands', 'shoulder', 'highpoint', 'scoop', 'catch']);
const handsOf = (a) => (TWO.has(a.pose) && a.hand2At ? [(a.handAt[0] + a.hand2At[0]) / 2, (a.handAt[1] + a.hand2At[1]) / 2] : a.handAt);
const along = (f, u) => [f.x0 + (f.x1 - f.x0) * u, f.y0 + (f.y1 - f.y0) * u, f.h0 + (f.h1 - f.h0) * u + f.apex * 4 * u * (1 - u)];

// S: the live scene. v: { sx, sy (yards -> screen), px (world -> screen), sp (sprite pixel on screen), yd (pixels per yard) }.
export function drawBall(ctx, S, v) {
  const b = S.ball, t = S.t, size = v.sp * 0.95;
  const put = (img, cx, cy) => ctx.drawImage(img, Math.round(cx - 7.5 * size), Math.round(cy - 7.5 * size), Math.round(15 * size), Math.round(15 * size));
  if (b.holder) { // in his hand: points forward, cocked back by the ear for a quarterback
    const a = b.holder; if (!a.handAt || a.vis?.view === 'back') return;
    const face = a.vis?.face || a.face, qb = a.qb && a.vis?.view === 'side' && !a.down, [hx, hy] = handsOf(a);
    put(turned(stepOf(face > 0 ? (qb ? -0.6 : 0) : Math.PI + (qb ? 0.6 : 0)), false), hx, hy);
    return;
  }
  const gx = v.sx(b.x), gy = v.sy(b.y), lift = (h) => h * v.yd * v.px, hy = gy - lift(b.h), f = b.flight;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';                                                     // its shadow on the grass
  const sw = Math.max(3, 8 - b.h * 0.35) * v.sp; ctx.fillRect(Math.round(gx - sw / 2), Math.round(gy - v.sp), Math.round(sw), Math.round(2 * v.sp));
  if (f && !b.kick) { // a short fading trail so you can see where the throw is going
    for (let k = 5; k >= 1; k--) {
      const u = (t - k * 0.035 - f.t0) / (f.t1 - f.t0); if (u <= 0) continue;
      const [x, y, h] = along(f, u), r = Math.round(2 * v.sp);
      ctx.globalAlpha = 0.07 * (6 - k); ctx.fillStyle = '#fff8e6'; ctx.fillRect(Math.round(v.sx(x) - r / 2), Math.round(v.sy(y) - lift(h) - r / 2), r, r);
    }
    ctx.globalAlpha = 1;
  }
  let bx = gx, by = hy;
  if (f && f.to?.handAt && !f.to.down) { // the last stretch of a catchable ball: it goes right into his hands
    const u = (t - f.t0) / (f.t1 - f.t0), k = clamp01((u - 0.78) / 0.22), e = k * k * (3 - 2 * k), [hx, hy2] = handsOf(f.to);
    bx = gx + (hx - gx) * e; by = hy + (hy2 - hy) * e;
  }
  let ang = 0;
  if (f && b.kick) ang = t * 14;                                                         // end over end
  else if (f && b.wobble) ang = t * 9 + Math.sin(t * 23) * 0.8;                          // a duck: tumbling, not a spiral
  else if (f) { const [nx, ny, nh] = along(f, Math.min(1, (t + 0.03 - f.t0) / (f.t1 - f.t0))); ang = Math.atan2(v.sy(ny) - lift(nh) - hy, v.sx(nx) - gx); }
  else if (b.loose) ang = b.loose.vh !== 0 ? t * 11 : Math.atan2(b.loose.vy, b.loose.vx || 0.01);   // tumbling while it bounces
  else if (S.tee && t < S.tee.t1 + 0.05) ang = Math.PI / 2;                              // standing up on the tee
  put(turned(stepOf(ang), !!f && !b.kick && !b.wobble && Math.floor(t * 18) % 2 === 0), bx, by);
}
