// A detailed close-up of a player's helmet from the side (facing left), 48x44 pixels: shell shading, each model's own features
// and facemask, chin strap, ear hole, the team's stripe and its logo on the side.
//   Axiom: angular "spaceship" panels and vent slots, white bumper plate, wide flat bars.
//   SpeedFlex: front flex panel, side vents, jaw rivets, Riddell bumper, three-bar mask.
//   F7: ridge lines over the crown, side strap and buckle, Schutt plate, tall cage mask.
//   Vicis Zero2: perforated dot pattern, seam line, hex vent, rounded mask with a nose bar.
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

const RY = { vicis: 16 };
function inShell(x, y, model) {
  const ry = RY[model] || 15;
  const e = ((x - 27) / 17) ** 2 + ((y - 19) / ry) ** 2 <= 1;
  const jaw = x >= 21 && x <= 33 && y >= 26 && y <= 37 && !((x <= 22 && y >= 36) || (x >= 32 && y >= 36));
  if (!e && !jaw) return false;
  if (x < 21 && y > 16) return false;
  if (y > 31 && x > 35) return false;
  return true;
}
const topY = (x, model) => Math.ceil(19 - (RY[model] || 15) * Math.sqrt(Math.max(0, 1 - ((x - 27) / 17) ** 2)));

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
  const v = shade(C.helmet, 0.35), hi = shade(C.helmet, 1.55);
  if (model === 'axiom') {
    // the "spaceship": angular raised panels with black cutouts between them
    g.poly([[15, 9], [21, 5], [24, 6], [18, 11]], v); g.line(15, 8, 21, 4, hi);
    g.poly([[26, 4], [33, 5], [33, 7], [26, 6]], v); g.line(26, 3, 33, 4, hi);
    g.poly([[23, 10], [30, 8], [32, 10], [25, 12]], v); g.line(23, 9, 30, 7, hi);
    g.poly([[35, 8], [40, 11], [41, 14], [36, 11]], v); g.line(36, 7, 41, 11, hi);
    g.poly([[39, 21], [42, 21], [43, 24], [41, 27], [38, 24]], v);
    g.poly([[32, 27], [36, 26], [36, 28], [32, 29]], v);
    g.rect(12, 12, 8, 2, '#eef0f2'); g.rect(13, 12, 5, 1, '#c8102e'); // Riddell plate
  } else if (model === 'speedflex') {
    g.line(14, 8, 14, 13, v); g.line(14, 8, 21, 5, v); g.line(21, 5, 22, 10, v); // flex panel
    g.line(15, 9, 20, 7, hi);
    g.line(30, 9, 35, 8, v, 2); g.line(37, 13, 41, 16, v, 2); // vents
    g.rect(25, 29, 2, 2, '#cfd3d8'); g.rect(25, 33, 2, 2, '#cfd3d8'); g.set(25, 29, '#ffffff'); g.set(25, 33, '#ffffff'); // jaw rivets
    g.rect(12, 12, 8, 2, '#eef0f2'); g.rect(13, 12, 5, 1, '#c8102e');
    g.rect(27, 23, 2, 2, INK); // ear hole
  } else if (model === 'f7') {
    for (let x = 14; x <= 41; x++) { const t = topY(x, model); g.set(x, t + 4, v); g.set(x, t + 8, shade(C.helmet, 0.6)); }
    g.line(24, 11, 23, 25, '#18191c', 2); g.rect(22, 15, 4, 3, '#cfd3d8'); g.rect(23, 16, 2, 1, '#18191c'); // strap and buckle
    g.rect(37, 28, 3, 2, '#18191c'); g.set(38, 28, '#d9b44a'); // F7 badge
    g.rect(28, 23, 2, 2, INK);
  } else if (model === 'vicis') {
    for (let y = 6; y <= 15; y++) for (let x = 19; x <= 32; x++) if ((x + y) % 2 === 0 && y % 2 === 0 && ((x - 25.5) / 7) ** 2 + ((y - 10.5) / 5) ** 2 <= 1) g.set(x, y, v);
    g.line(14, 14, 24, 17, shade(C.helmet, 0.7)); g.line(24, 17, 41, 12, shade(C.helmet, 0.7)); // seam
    g.rect(37, 21, 3, 5, v); g.set(38, 20, v); g.set(38, 26, v);
    g.rect(29, 22, 3, 1, hi); g.rect(30, 21, 1, 3, hi); // side tab
    g.rect(12, 12, 6, 2, '#eef0f2'); g.rect(13, 12, 4, 1, '#8a8f97');
  }
}

function mask(g, C, model) {
  const m = C.mask, ms = shade(m, 0.7), mh = shade(m, 1.5);
  if (model === 'f7') {
    g.line(12, 16, 7, 19, m); g.line(7, 19, 7, 36, m); g.line(7, 36, 18, 38, ms);
    [21, 25, 29, 33].forEach((y) => g.line(7, y, 22, y + 1, y % 2 ? m : ms));
    g.line(7, 25, 12, 20, m); g.rect(11, 14, 8, 2, '#2a2b30'); g.rect(13, 14, 3, 1, '#cfd3d8');
  } else if (model === 'axiom') {
    g.line(12, 16, 9, 19, m); g.line(8, 19, 8, 33, m); g.line(9, 19, 9, 33, ms); g.line(9, 34, 18, 37, ms);
    g.line(9, 21, 22, 21, m); g.line(9, 22, 22, 22, ms); g.line(9, 28, 22, 29, m); g.line(10, 33, 22, 33, ms);
  } else if (model === 'vicis') {
    g.line(12, 16, 7, 20, mh); g.line(6, 20, 6, 32, m); g.line(7, 33, 17, 37, m);
    g.line(6, 22, 22, 22, mh); g.line(7, 27, 22, 28, m); g.line(8, 32, 21, 33, ms); g.line(12, 17, 14, 27, m);
    g.set(7, 21, '#ffffff'); g.set(13, 22, '#ffffff');
  } else {
    g.line(12, 16, 8, 19, m); g.line(8, 19, 8, 34, m); g.line(8, 35, 18, 38, ms);
    g.line(8, 22, 22, 22, m); g.line(8, 28, 22, 28, m); g.line(9, 33, 21, 33, ms);
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
