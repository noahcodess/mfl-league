// The football: pointed ends, laces and a highlight, turned to point the way it's flying. Passes spiral (the laces flash),
// kicks tumble end over end, a shadow on the grass shows where it is over the field, and a short trail shows its path.
const ART = ['...OOOOO...', '.OOHHBBBOO.', 'OBHHBWBWBBO', 'OBBWWWWWBBO', 'OBBBBWBWBDO', '.OODDDDDOO.', '...OOOOO...'];
const COL = { O: '#1a0f08', B: '#8b4a1f', H: '#b8692f', W: '#f4f1e8', D: '#6b3614' };
const cache = new Map();

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

// at: { x, y } world yards → screen via v.sx / v.sy; v.px world→screen scale, v.sp sprite pixel size on screen, v.yd pixels per yard.
export function drawBall(ctx, S, t, v, ballAt, holderAt) {
  const b = ballAt(S, t); if (!b || b.hide) return;
  const size = v.sp * 0.95, put = (img, cx, cy) => ctx.drawImage(img, Math.round(cx - 7.5 * size), Math.round(cy - 7.5 * size), Math.round(15 * size), Math.round(15 * size));
  const gx = v.sx(b.x), gy = v.sy(b.y), hy = gy - b.h * v.yd * v.px;
  if (b.held) { // in his hand: points forward, cocked back by the ear for a quarterback
    const a = holderAt; if (!a?.handAt) return;
    const face = a.vis?.face || a.face, qb = a.qb && a.vis?.view === 'side';
    put(turned(stepOf(face > 0 ? (qb ? -0.6 : 0) : Math.PI + (qb ? 0.6 : 0)), false), a.handAt[0], a.handAt[1]);
    return;
  }
  const kick = ['kickoff', 'punt', 'fg', 'xp'].includes(S.play.kind) && b.spin;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';                                                     // its shadow on the grass
  const sw = Math.max(3, 8 - b.h * 0.35) * v.sp; ctx.fillRect(Math.round(gx - sw / 2), Math.round(gy - v.sp), Math.round(sw), Math.round(2 * v.sp));
  if (b.spin) { // a short fading trail so you can see where it's going
    for (let k = 5; k >= 1; k--) { const p = ballAt(S, t - k * 0.035); if (!p || !p.spin) continue; ctx.globalAlpha = 0.07 * (6 - k); ctx.fillStyle = '#fff8e6'; const r = Math.round(2 * v.sp); ctx.fillRect(Math.round(v.sx(p.x) - r / 2), Math.round(v.sy(p.y) - p.h * v.yd * v.px - r / 2), r, r); }
    ctx.globalAlpha = 1;
  }
  let ang = 0;
  if (kick) ang = t * 14;                                                                // end over end
  else if (b.spin) { const n = ballAt(S, t + 0.03); if (n) ang = Math.atan2((v.sy(n.y) - n.h * v.yd * v.px) - hy, v.sx(n.x) - gx); }
  else if (S.tee && t < S.tee.t1 + 0.05) ang = Math.PI / 2;                              // standing up on the tee
  put(turned(stepOf(ang), b.spin && !kick && Math.floor(t * 18) % 2 === 0), gx, hy);
}
