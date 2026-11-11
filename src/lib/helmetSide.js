// A detailed close-up of a player's helmet from the side (facing left), 48x44 pixels: each model's own silhouette, shading,
// features and facemask, chin strap, ear hole, the team's stripe and its logo on the side.
//   Axiom: long, low, sleek shell with black stealth cutouts, white bumper plate, thick integrated mask.
//   SpeedFlex: tall round dome, front flex panel, big jaw flap with clips, side vents, thin bars.
//   F7: boxy shell with raised ridges, side strap and buckle, Schutt plate, tall cage mask.
import { shade } from './pixels.js';

const W = 48, H = 44, INK = '#140d0a';

function grid() {
  const px = new Array(W * H).fill(null);
  const g = { px, set(x, y, c) { if (c && x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = c; }, get(x, y) { return px[y * W + x]; } };
  g.line = (x0, y0, x1, y1, c, w = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); for (let k = 0; k < w; k++) g.set(x, y + k, c); } };
  g.rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.set(x + i, y + j, c); };
  g.poly = (pts, c) => { // filled polygon
    const ys = pts.map((q) => q[1]);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) for (let x = 0; x < W; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) g.set(x, y, c);
    }
  };
  return g;
}

// Silhouettes: Axiom long and low, SpeedFlex a tall dome with a big jaw flap, F7 boxy (squarer curve).
const SHAPE = { axiom: { cx: 27, cy: 20, rx: 19, ry: 13, p: 2, jaw: [20, 34, 27, 37] }, speedflex: { cx: 27, cy: 19, rx: 16, ry: 16, p: 2, jaw: [19, 33, 25, 39] },
  f7: { cx: 27, cy: 19, rx: 17, ry: 15, p: 3.2, jaw: [21, 33, 27, 36] } };
function inShell(x, y, model) {
  const s = SHAPE[model] || SHAPE.speedflex;
  const e = Math.abs((x - s.cx) / s.rx) ** s.p + Math.abs((y - s.cy) / s.ry) ** s.p <= 1;
  const [j0, j1, jt, jb] = s.jaw;
  const jaw = x >= j0 && x <= j1 && y >= jt && y <= jb && !((x <= j0 + 1 && y >= jb - 1) || (x >= j1 - 1 && y >= jb - 1));
  if (!e && !jaw) return false;
  if (x < j0 && y > 16) return false;
  if (y > 31 && x > j1 + 2) return false;
  return true;
}
const topY = (x, model) => { for (let y = 0; y < H; y++) if (inShell(x, y, model)) return y; return H; };

function shell(g, C, model) {
  const c = C.helmet;
  const tones = [shade(c, 0.55), shade(c, 0.74), c, shade(c, 1.2), shade(c, 1.45)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inShell(x, y, model)) continue;
    const l = -0.5 * (x - 27) / 17 - 0.75 * (y - 19) / 15;
    const edge = [[1, 0], [0, 1]].some(([dx, dy]) => !inShell(x + dx, y + dy, model));
    g.set(x, y, edge ? tones[0] : tones[l > 0.6 ? 4 : l > 0.28 ? 3 : l > -0.35 ? 2 : 1]);
  }
  // inside the face opening: padding and the chin cup
  for (let y = 17; y <= 34; y++) for (let x = 14; x <= 21; x++) if (((x - 21) / 8) ** 2 + ((y - 25) / 10) ** 2 <= 1) g.set(x, y, '#1d1d21');
  g.rect(15, 31, 6, 4, '#e3e5e9'); g.rect(15, 34, 5, 1, '#c3c6cc');
  g.line(24, 27, 19, 32, '#e9eaee'); // chin strap
}

function design(g, C, model, d) {
  const s = C.stripe === C.helmet ? C.numbers : C.stripe;
  const rows = d === 'double' ? [1, 3] : d === 'stripe' || d === 'logo_stripe' ? [1, 2] : [];
  for (let x = 13; x <= 42; x++) rows.forEach((r) => { const y = topY(x, model) + r; if (inShell(x, y, model)) g.set(x, y, x > 34 ? shade(s, 0.8) : s); });
}

function features(g, C, model) {
  const v = '#141518', hi = shade(C.helmet, 1.55), lo = shade(C.helmet, 0.6);
  if (model === 'axiom') {
    // stealth cutouts: long black blades sweeping back over a low, sleek shell
    g.poly([[13, 11], [22, 6], [26, 7], [16, 12]], v); g.line(13, 10, 22, 5, hi);
    g.poly([[24, 9], [36, 7], [37, 9], [26, 11]], v); g.line(24, 8, 36, 6, hi);
    g.poly([[38, 9], [44, 14], [44, 17], [38, 12]], v);
    g.poly([[40, 22], [44, 21], [45, 25], [41, 27]], v);
    g.poly([[30, 28], [35, 27], [35, 30], [30, 31]], v);
    g.rect(10, 13, 9, 2, '#eef0f2'); g.rect(12, 13, 5, 1, '#c8102e'); // Riddell plate
  } else if (model === 'speedflex') {
    // the flex panel: a raised U cut into the forehead
    g.line(14, 13, 14, 8, v); g.line(14, 8, 18, 4, v); g.line(18, 4, 23, 3, v); g.line(23, 3, 24, 9, v); g.line(24, 9, 20, 12, v);
    g.line(15, 9, 19, 5, hi); g.line(16, 10, 20, 6, shade(C.helmet, 1.25));
    g.line(30, 8, 35, 7, v, 2); g.line(37, 12, 40, 15, v, 2); g.line(38, 20, 41, 22, v);
    g.line(20, 26, 33, 26, lo); // jaw flap seam
    g.rect(31, 29, 2, 2, '#cfd3d8'); g.rect(31, 34, 2, 2, '#cfd3d8'); g.set(31, 29, '#ffffff'); g.set(31, 34, '#ffffff'); // jaw clips
    g.rect(11, 12, 8, 2, '#eef0f2'); g.rect(12, 12, 5, 1, '#c8102e');
    g.rect(28, 21, 2, 2, v); // ear hole
  } else {
    // raised ridges front to back, each a light edge over a dark groove
    [4, 8, 12].forEach((k) => { for (let x = 13; x <= 43; x++) { const t = topY(x, model); if (inShell(x, t + k, model)) { g.set(x, t + k - 1, hi); g.set(x, t + k, lo); } } });
    g.line(25, 6, 23, 25, '#18191c', 2); g.rect(22, 14, 4, 3, '#cfd3d8'); g.rect(23, 15, 2, 1, '#18191c'); // strap and buckle
    g.rect(36, 28, 3, 2, '#18191c'); g.set(37, 28, '#d9b44a'); // F7 badge
    g.rect(29, 23, 2, 2, v);
  }
}

function mask(g, C, model) {
  const m = C.mask, ms = shade(m, 0.7);
  if (model === 'f7') { // tall cage, lots of bars, plate on top
    g.line(12, 16, 6, 19, m); g.line(6, 19, 6, 37, m); g.line(6, 37, 18, 39, ms);
    [21, 25, 29, 33].forEach((y) => g.line(6, y, 22, y + 1, y % 2 ? m : ms));
    g.line(9, 18, 9, 37, ms); g.line(12, 17, 12, 38, ms); g.line(6, 25, 12, 20, m);
    g.rect(10, 13, 9, 3, '#2a2b30'); g.rect(12, 14, 4, 1, '#cfd3d8');
  } else if (model === 'axiom') { // thick, low, integrated
    g.line(10, 15, 7, 19, m); g.line(6, 19, 6, 33, m); g.line(7, 19, 7, 33, ms); g.line(7, 34, 19, 37, ms); g.line(7, 35, 19, 38, m);
    g.line(7, 20, 21, 20, m); g.line(7, 21, 21, 21, ms); g.line(7, 28, 21, 29, m); g.line(7, 29, 21, 30, ms);
  } else { // thin bars with an S-shaped side
    g.line(12, 15, 8, 18, m); g.line(8, 18, 7, 22, m); g.line(7, 22, 9, 27, m); g.line(9, 27, 7, 32, m); g.line(7, 33, 18, 38, ms);
    g.line(8, 21, 21, 21, m); g.line(8, 27, 21, 27, m); g.line(8, 32, 20, 33, ms);
  }
}

// Draws the helmet onto `canvas` (48x44). `logo` is an already-loaded Image for teams whose design shows the logo.
export function drawHelmetSide(canvas, colors, model = 'speedflex', helmetDesign = 'stripe', logo = null) {
  const fg = grid(), out = grid();
  shell(fg, colors, model);
  design(fg, colors, model, helmetDesign);
  features(fg, colors, model);
  mask(fg, colors, model);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (fg.get(x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => fg.get(x + dx, y + dy))) out.set(x, y, INK);
  }
  fg.px.forEach((c, i) => { if (c) out.px[i] = c; });
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  out.px.forEach((c, i) => { if (c) { ctx.fillStyle = c; ctx.fillRect(i % W, Math.floor(i / W), 1, 1); } });
  if (logo && (helmetDesign === 'logo' || helmetDesign === 'logo_stripe')) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(logo, 27, 13, 12, 12);
    ctx.globalCompositeOperation = 'source-over';
  }
}
