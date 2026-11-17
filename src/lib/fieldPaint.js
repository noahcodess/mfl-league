// Logos painted onto the turf, the way real field paint looks: the grass texture and the mowing stripes show through the
// paint, a few blades poke through as specks, and the edges are a touch soft. mono: the league logo in field paint, white
// with black outlines (light parts white, dark parts black, and a black edge around the whole thing).

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// ctx: the field canvas (world pixels). img: a loaded logo. (cx, cy): center. box: the size it fits in.
export function paintLogo(ctx, img, cx, cy, box, { mono = false, seed = 1 } = {}) {
  if (!img) return;
  const k = Math.min(box / img.width, box / img.height), W = Math.round(img.width * k), H = Math.round(img.height * k), P = 2;
  const x0 = Math.round(cx - W / 2) - P, y0 = Math.round(cy - H / 2) - P, w = W + P * 2, h = H + P * 2;
  const off = document.createElement('canvas'); off.width = w; off.height = h;
  const o = off.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(img, P, P, W, H);
  let logo, turf;
  try { logo = o.getImageData(0, 0, w, h).data; turf = ctx.getImageData(x0, y0, w, h); } catch { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, x0 + P, y0 + P, W, H); return; }   // a logo we can't read: just draw it
  const g = turf.data, solid = (i) => logo[i * 4 + 3] > 110;
  // the grass's average (field lines left out), so a yard line running under a logo doesn't show through the paint
  let sum = 0, n = 0; const mean = [0, 0, 0];
  for (let i = 0; i < w * h; i++) { const L = lum(g[i * 4], g[i * 4 + 1], g[i * 4 + 2]); if (L > 150) continue; sum += L; n += 1; for (let c = 0; c < 3; c++) mean[c] += g[i * 4 + c]; }
  const avg = sum / Math.max(1, n) || 1; for (let c = 0; c < 3; c++) mean[c] /= Math.max(1, n);
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, q = i * 4, near = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < w && yy < h && solid(yy * w + xx); };
    let col = null, cover = 0.86;
    if (solid(i)) {
      if (mono) col = lum(logo[q], logo[q + 1], logo[q + 2]) < 80 ? [22, 22, 22] : [250, 250, 246];
      else col = [logo[q], logo[q + 1], logo[q + 2]];
      if (!near(-1, 0) || !near(1, 0) || !near(0, -1) || !near(0, 1)) cover *= 0.8;   // a soft edge
    } else if (mono && (near(-1, 0) || near(1, 0) || near(0, -1) || near(0, 1) || near(-2, 0) || near(2, 0) || near(0, -2) || near(0, 2))) {
      col = [18, 18, 18]; cover = 0.78;   // the black outline around it
    }
    if (!col) continue;
    if (rnd() < 0.05) cover *= 0.35;   // grass poking through the paint
    if (lum(g[q], g[q + 1], g[q + 2]) > 150) for (let c = 0; c < 3; c++) g[q + c] = mean[c];   // a line under the logo: painted over
    const tex = Math.max(0.8, Math.min(1.18, lum(g[q], g[q + 1], g[q + 2]) / avg));   // the turf's own light and dark under the paint
    for (let c = 0; c < 3; c++) g[q + c] = Math.round(g[q + c] * (1 - cover) + Math.min(255, col[c] * tex) * cover);
  }
  ctx.putImageData(turf, x0, y0);
}
