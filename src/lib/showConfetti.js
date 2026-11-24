// Confetti for the award show, drawn at screen resolution: a few hundred paper pieces in the Craft Bowl's colors and gold
// that burst in from the top, flutter (they turn edge-on and back), spin and sway as they fall. u: seconds since it began.
const N = 260;
const PIECES = Array.from({ length: N }, (_, i) => {
  const r = (k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
  return { x: r(1), delay: r(2) * 1.4, fall: 0.11 + r(3) * 0.09, sway: 0.01 + r(4) * 0.025, sp: 1 + r(5) * 2.5, flip: 3 + r(6) * 6, w: 0.006 + r(7) * 0.006, h: 0.004 + r(8) * 0.004, c: Math.floor(r(9) * 6), ph: r(10) * 6.28 };
});

export function drawConfetti(ctx, u, colors) {
  if (u <= 0) return;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  for (const p of PIECES) {
    const tt = u - p.delay; if (tt <= 0) continue;
    const y = (-0.05 + tt * p.fall * (1 + Math.min(1, tt) * 0.4)) * H; if (y > H + 20) continue;
    const x = (p.x + Math.sin(tt * p.sp + p.ph) * p.sway) * W, flutter = Math.cos(tt * p.flip + p.ph);
    ctx.setTransform(1, 0, 0, 1, x, y); ctx.rotate(tt * p.sp * 0.8 + p.ph);
    ctx.globalAlpha = Math.min(1, (H + 20 - y) / 120);
    ctx.fillStyle = colors[p.c % colors.length];
    ctx.fillRect((-p.w * W) / 2, (-p.h * W * Math.abs(flutter)) / 2, p.w * W, Math.max(1, p.h * W * Math.abs(flutter)));
  }
  ctx.restore();
}
