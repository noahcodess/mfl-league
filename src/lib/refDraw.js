// Draws one official in the field's pixel style: striped shirt, black pants, cap (white for the referee), a running cycle
// in one of three gaits, and arms that move through every signal: throwing the flag and holding the arm up, touchdown,
// incomplete, first down, timeout, and the penalty signals (holding, false start, offside, pass interference, delay of game).
// Positions are in sprite pixels from his feet; sp = screen pixels per sprite pixel.
const SKIN = '#d9a676', BLK = '#14161a', WHT = '#f4f4f0', D = Math.PI / 180;

// Arm angles in degrees for a pose at time u (seconds into it): [left shoulder, left elbow, right shoulder, right elbow].
// 0 = hanging down, 90 = straight out to his side, 180 = straight up; past 180 / below 0 swings inward across him.
export function armsFor(sig, u, run) {
  const w = Math.sin(u * 9), w2 = Math.sin(u * 6);
  switch (sig) {
    case 'throw': { const k = Math.min(1, u / 0.35); return [15, 0, 170 - 130 * k, -20 * k]; }
    case 'flagArm': return [12, 0, 176, 0];
    case 'td': return [176, 0, 176, 0];
    case 'incomplete': return [60 + 70 * w, 0, 60 + 70 * w, 0];
    case 'first': return [12, 0, 92, 0];
    case 'timeout': return [165 + 22 * w2, 0, 165 + 22 * w2, 0];
    case 'Holding': case 'Defensive holding': return [-35, 0, 55 + 12 * w2, -45];
    case 'False start': return [38, -105 + 35 * Math.sin(u * 8), 38, -105 + 35 * Math.cos(u * 8)];
    case 'Offside': return [40, -110, 40, -110];
    case 'Defensive pass interference': case 'Offensive pass interference': { const p = Math.max(0, Math.sin(u * 5)); return [90, -90 + 80 * p, 90, -90 + 80 * p]; }
    case 'Delay of game': return [28, -128, 28, -128];
    default: { if (!run) return [10, 0, 10, 0]; const s = Math.sin(run); return [18 + 22 * s, 25, 18 - 22 * s, 25]; }
  }
}

// ref: { cap, face, run, sp, gait, sig, sigAt }. X, Y: his feet on screen. t: scene time. over: { sig, u } to force a pose (the close-up).
export function drawRef(ctx, X, Y, sp, ref, t, over = null) {
  const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(X + x * sp), Math.round(Y + y * sp), Math.max(1, Math.round(w * sp)), Math.max(1, Math.round(h * sp))); };
  const moving = !over && (ref.sp || 0) > 0.5, freq = [1.7, 2.2, 1.5][ref.gait || 0], ph = (ref.run || 0) * freq;
  const lift = moving ? [Math.max(0, Math.sin(ph)) * 3, Math.max(0, -Math.sin(ph)) * 3] : [0, 0], bob = moving && ref.gait === 2 ? Math.abs(Math.sin(ph)) * 1.2 : 0;
  const sig = over?.sig ?? ref.sig, u = over ? over.u : t - (ref.sigAt || 0);
  // legs: black pants, black shoes
  [[-5, lift[0]], [1, lift[1]]].forEach(([lx, up]) => { r(lx, -18 - up - bob, 4, 16, BLK); r(lx - (ref.face < 0 ? 1 : 0), -2 - up - bob, 5, 2, '#050607'); });
  const by = -bob;   // the body rides the bob
  for (let c = -7; c < 7; c += 2) r(c, -34 + by, 2, 16, ((c + 7) / 2) % 2 ? BLK : WHT);   // the stripes
  r(-7, -34 + by, 14, 1, BLK); r(-7, -19 + by, 14, 1, BLK);
  // head and cap (brim toward where he's facing)
  r(-4, -42 + by, 8, 8, SKIN); r(ref.face > 0 ? 1 : -2, -39 + by, 1, 1, BLK); r(ref.face > 0 ? 3 : -4, -39 + by, 1, 1, BLK);
  const cap = ref.cap === 'white' ? WHT : BLK; r(-4, -45 + by, 8, 3, cap); r(ref.face > 0 ? 2 : -6, -42 + by, 4, 1, cap);
  // arms: two striped segments and a hand
  const [la, le, ra, re] = armsFor(sig, u, moving ? ph : 0);
  [[-1, la, le], [1, ra, re]].forEach(([side, a, e]) => {
    let x = side * 7, y = -32 + by;
    [[a, 7], [a + e, 6]].forEach(([deg, len], seg) => {
      const dx = Math.sin(deg * D) * side, dy = Math.cos(deg * D);
      for (let k = 0; k < len; k += 1.5) r(x + dx * k - 1.5, y + dy * k - 1.5, 3, 3, Math.floor(k / 2) % 2 ? BLK : WHT);
      x += dx * len; y += dy * len;
      if (seg === 1) r(x - 1.5, y - 1.5, 3, 3, SKIN);
    });
  });
}

// The yellow flag: fluttering in the air on its way down, then lying on the grass.
export function drawFlag(ctx, X, Y, sp, f) {
  ctx.fillStyle = '#ffd400';
  if (f.landed) { ctx.fillRect(Math.round(X - 2.5 * sp), Math.round(Y - 1.5 * sp), Math.round(5 * sp), Math.round(3 * sp)); return; }
  const k = Math.abs(Math.sin(f.spin)); ctx.fillRect(Math.round(X - 2.5 * sp * k), Math.round(Y - 2 * sp), Math.max(1, Math.round(5 * sp * k)), Math.round(4 * sp));
}
