// The award show's graphic: a pixel-art backdrop (rays and a gold diamond lattice on deep purple and wine, a gilded frame
// with corner ornaments) that zooms in behind the nominees, and the big award and winner titles drawn over it at screen
// resolution in a plain, readable font.
import { GOLD } from './stageArt.js';

export const PANEL = { x: 68, y: 29, w: 184, h: 97 };
let art = null;

function paint() {
  const { w, h } = PANEL, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), r = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x - w / 2, dy = y - h * 0.42, ang = Math.atan2(dy, dx), ray = Math.sin(ang * 14) > 0.55 ? 1 : 0, d = Math.hypot(dx / w, dy / h);
    const k = Math.max(0, 1 - d * 1.6);
    const R = 30 + 70 * k + ray * 14 * k, G2 = 10 + 18 * k + ray * 8 * k, B = 48 + 46 * k + ray * 10 * k;
    g.fillStyle = `rgb(${Math.round(R)},${Math.round(G2)},${Math.round(B)})`; g.fillRect(x, y, 1, 1);
  }
  for (let y = 0; y < h; y += 2) for (let x = (y / 2) % 2; x < w; x += 2) {   // a gold diamond lattice, dithered
    const u = ((x + y) % 16), v = ((x - y + 1600) % 16);
    if (u === 0 || v === 0) r(x, y, 1, 1, 'rgba(233,195,104,0.22)');
  }
  for (let i = 0; i < 70; i++) { const x = (i * 71) % w, y = (i * 37) % h; r(x, y, 1, 1, i % 4 ? 'rgba(255,240,200,0.5)' : GOLD[4]); if (i % 9 === 0) { r(x - 1, y, 3, 1, 'rgba(255,240,200,0.35)'); r(x, y - 1, 1, 3, 'rgba(255,240,200,0.35)'); } }
  r(0, 0, w, 2, GOLD[3]); r(0, h - 2, w, 2, GOLD[1]); r(0, 0, 2, h, GOLD[2]); r(w - 2, 0, 2, h, GOLD[1]);   // gilded frame
  r(3, 3, w - 6, 1, GOLD[1]); r(3, h - 4, w - 6, 1, GOLD[0]); r(3, 3, 1, h - 6, GOLD[1]); r(w - 4, 3, 1, h - 6, GOLD[0]);
  for (const [cx, cy] of [[6, 6], [w - 7, 6], [6, h - 7], [w - 7, h - 7]]) {   // corner ornaments
    r(cx - 3, cy, 7, 1, GOLD[3]); r(cx, cy - 3, 1, 7, GOLD[3]); r(cx - 1, cy - 1, 3, 3, GOLD[4]); r(cx, cy, 1, 1, '#8a1726');
  }
  return c;
}

// Draws the backdrop in world space (the canvas is scaled to the world). k: 0..1 how far it has zoomed in.
export function drawPanel(ctx, k) {
  if (k <= 0) return;
  art ||= paint();
  const s = 0.55 + 0.45 * k, { x, y, w, h } = PANEL, cx = x + w / 2, cy = y + h / 2;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.4); ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, cy); ctx.scale(s, s); ctx.drawImage(art, -w / 2, -h / 2); ctx.restore();
}

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
// A title at screen resolution: gold or white, with a glow. size and y are in world units (xf converts them).
export function title(ctx, xf, text, wx, wy, size, { gold = false, weight = 900, alpha = 1, spacing = 0, maxW = 220 } = {}) {
  if (alpha <= 0 || !text) return;
  const { s, X, Y } = xf, px = size * s;
  ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${weight} ${px}px ${FONT}`;
  if (spacing) ctx.letterSpacing = `${spacing * s}px`;
  if (gold) { const g = ctx.createLinearGradient(0, Y(wy) - px / 2, 0, Y(wy) + px / 2); g.addColorStop(0, '#fff6cf'); g.addColorStop(0.5, '#e9c368'); g.addColorStop(1, '#a87a26'); ctx.fillStyle = g; }
  else ctx.fillStyle = '#ffffff';
  ctx.shadowColor = gold ? 'rgba(233,195,104,0.55)' : 'rgba(0,0,0,0.6)'; ctx.shadowBlur = px * 0.35;
  ctx.fillText(text, X(wx), Y(wy), maxW * s); ctx.restore();
}
