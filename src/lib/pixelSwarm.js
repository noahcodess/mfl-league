// Moving pixel effects for broadcast graphics, drawn on small canvases that get scaled up chunky. drift: pixels floating
// across a background. orbit: pixels circling something in the middle (a logo). sting: the network transition, where tiles
// ripple out from the middle until they cover the screen, then ripple away to show the next shot.

function rand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const any = (r, list) => list[Math.floor(r() * list.length)];

export function makeDrift(w, h, palette, n = 70, seed = 7) {
  const r = rand(seed);
  const ps = Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, s: any(r, [2, 3, 4, 6]), vx: 0.15 + r() * 0.5, vy: (r() - 0.5) * 0.3, c: any(r, palette), a: 0.25 + r() * 0.6, ph: r() * 6.3 }));
  return (ctx, t) => {
    ctx.clearRect(0, 0, w, h);
    ps.forEach((p) => {
      p.x += p.vx; p.y += p.vy + Math.sin(t / 600 + p.ph) * 0.12;
      if (p.x > w + 8) p.x = -8; if (p.y > h + 8) p.y = -8; if (p.y < -8) p.y = h + 8;
      ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t / 280 + p.ph));
      ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    });
    ctx.globalAlpha = 1;
  };
}

export function makeOrbit(w, h, palette, n = 46, seed = 3) {
  const r = rand(seed), cx = w / 2, cy = h / 2, max = Math.min(w, h) / 2;
  const ps = Array.from({ length: n }, () => ({ rad: max * (0.45 + r() * 0.55), ang: r() * 6.3, sp: (0.004 + r() * 0.012) * (r() < 0.5 ? 1 : -1), s: any(r, [2, 3, 4]), c: any(r, palette), wob: r() * 6 }));
  return (ctx, t) => {
    ctx.clearRect(0, 0, w, h);
    ps.forEach((p) => {
      p.ang += p.sp;
      const rr = p.rad + Math.sin(t / 400 + p.wob) * 3;
      ctx.fillStyle = p.c; ctx.fillRect(Math.round(cx + Math.cos(p.ang) * rr), Math.round(cy + Math.sin(p.ang) * rr * 0.8), p.s, p.s);
    });
  };
}

// ms: time since the transition started (0 to 900). Covered completely at 450.
export const STING_MS = 900, STING_MID = 450;
export function makeSting(w, h, palette, cell = 16, seed = 11) {
  const r = rand(seed), cols = Math.ceil(w / cell), rows = Math.ceil(h / cell), far = Math.hypot(cols / 2, rows / 2);
  const tiles = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) tiles.push({ x, y, d: Math.hypot(x + 0.5 - cols / 2, y + 0.5 - rows / 2) / far, c: any(r, palette) });
  const sparks = Array.from({ length: 60 }, () => ({ a: r() * 6.3, v: 1.5 + r() * 4, s: any(r, [2, 3, 4]), c: any(r, palette) }));
  const clamp = (v) => Math.max(0, Math.min(1, v));
  return (ctx, ms) => {
    ctx.clearRect(0, 0, w, h);
    tiles.forEach((t) => {
      const k = ms < STING_MID ? clamp((ms - t.d * 260) / 120) : 1 - clamp((ms - STING_MID - t.d * 260) / 120);
      if (k <= 0) return;
      const s = Math.ceil(cell * k);
      ctx.fillStyle = t.c; ctx.fillRect(t.x * cell + (cell - s) / 2, t.y * cell + (cell - s) / 2, s, s);
    });
    if (ms > STING_MID) {
      const go = (ms - STING_MID) / 4;
      sparks.forEach((p) => { ctx.fillStyle = p.c; ctx.fillRect(Math.round(w / 2 + Math.cos(p.a) * p.v * go), Math.round(h / 2 + Math.sin(p.a) * p.v * go), p.s, p.s); });
    }
  };
}

// Weather over the field shot: snow, rain, ash or spores falling as pixels. kind: 'snow' | 'rain' | 'ash' | 'spores' | null.
export function weatherKind(sky = '') {
  if (/snow|flurr/i.test(sky)) return 'snow';
  if (/rain|drizzle/i.test(sky)) return 'rain';
  if (/ash|ember/i.test(sky)) return 'ash';
  if (/spore/i.test(sky)) return 'spores';
  return null;
}
export function makeFall(w, h, kind, seed = 5) {
  const r = rand(seed), look = { snow: ['#ffffff', 1, 0.6, 90], rain: ['#9cc4ff', 1, 3.2, 120], ash: ['#8a8580', 2, 0.8, 70], spores: ['#3fe0c8', 1, -0.3, 60] }[kind];
  if (!look) return () => {};
  const [c, s, v, n] = look;
  const ps = Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, v: v * (0.6 + r() * 0.8), ph: r() * 6.3 }));
  return (ctx, t) => {
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = c;
    ps.forEach((p) => {
      p.y += p.v; p.x += Math.sin(t / 700 + p.ph) * (kind === 'rain' ? 0.1 : 0.35);
      if (p.y > h) p.y = -4; if (p.y < -4) p.y = h; if (p.x > w) p.x = 0; if (p.x < 0) p.x = w;
      ctx.globalAlpha = kind === 'spores' ? 0.5 + 0.5 * Math.sin(t / 200 + p.ph) : 0.85;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, kind === 'rain' ? 4 : s);
    });
    ctx.globalAlpha = 1;
  };
}
