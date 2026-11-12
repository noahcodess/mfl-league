// The two end zones, each team's own: a background painted on the turf (solid, diagonal weave, stripes, checker, chevrons
// pointing at the goal line, box, or fade) and the word in one of the end zone fonts, turned to face the field.
import { shade, brightness } from './pixels.js';
import { YD, FY0, FH, brush } from './fieldLayout.js';
import { renderWord } from './endZoneFonts.js';
import { withShadow, shadowColor } from './fontShadow.js';

export { FONTS, fontsFor } from './endZoneFonts.js';
const ZW = 10 * YD;
export const DESIGNS = [['solid', 'Solid'], ['diagonal', 'Diagonal'], ['stripes', 'Stripes'], ['checker', 'Checker'], ['chevron', 'Chevrons'],
  ['border', 'Box'], ['fade', 'Fade']];
const pick = (on, ...cs) => [...cs, '#f2f5ee', '#16171a'].find((c) => c && Math.abs(brightness(c) - brightness(on)) > 0.33);

function paintDesign(r, x0, design, c, inward, accent) {
  const c2 = shade(c, 0.86);
  const each = (fn) => { for (let y = 0; y < FH; y += 2) for (let x = 0; x < ZW; x += 2) { const col = fn(x, y); if (col) r(x0 + x, FY0 + y, 2, 2, col); } };
  r(x0, FY0, ZW, FH, c);
  if (design === 'diagonal') each((x, y) => ((x + y) % 12 < 2 ? c2 : null));
  if (design === 'stripes') each((x) => (Math.floor(x / 15) % 2 ? c2 : null));
  if (design === 'checker') each((x, y) => ((Math.floor(x / 20) + Math.floor(y / 20)) % 2 ? c2 : null));
  if (design === 'chevron') each((x, y) => { const xx = inward ? x : ZW - x; return (xx + Math.abs((y % 48) - 24)) % 36 < 12 ? c2 : null; });
  if (design === 'fade') for (let i = 0; i < 8; i++) { const w = ZW / 8, x = inward ? i * w : ZW - (i + 1) * w; r(x0 + x, FY0, w, FH, shade(c, 0.68 + i * 0.04)); }
  if (design === 'border') { const b = pick(c, accent); r(x0 + 8, FY0 + 8, ZW - 16, 4, b); r(x0 + 8, FY0 + FH - 12, ZW - 16, 4, b); r(x0 + 8, FY0 + 8, 4, FH - 16, b); r(x0 + ZW - 12, FY0 + 8, 4, FH - 16, b); }
}

// Cuts the empty margin off a word picture so it can be sized by what's actually drawn.
function trim(cv) {
  const { data, width: w, height: h } = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return x1 < 0 ? { cv, x: 0, y: 0, w: 1, h: 1 } : { cv, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// The word picture for a team in a font with its shadow, trimmed. look: { font, shadow, shadowColor }.
// Used by the end zones and the Customize previews.
export function endZoneWord(team, word, look = {}) {
  const ink = pick(team.color, team.accent), edge = shade(team.color, 0.45);
  const cv = renderWord(look.font || 'block', word.toUpperCase(), { ink, edge, base: team.color }, team);
  return trim(withShadow(cv, look.shadow || 'drop', shadowColor(team, look.shadowColor || 'dark', ink)));
}

// The two words a team paints: its place in the left end zone, its nickname in the right one.
export function endZoneWords(team) {
  const words = team.name.split(' ');
  return [team.location || words.slice(0, -1).join(' ') || team.name, team.nickname || words[words.length - 1]];
}

// x0: left edge of the end zone. dir: 'up' for the left end zone, 'down' for the right one (letters face the field).
export function drawEndZone(ctx, team, x0, word, dir, look = {}) {
  paintDesign(brush(ctx), x0, look.design || 'diagonal', team.color, dir === 'up', team.accent);
  const w = endZoneWord(team, word, look);
  let s = 1;
  while (w.w * (s + 1) <= FH - 70 && w.h * (s + 1) <= ZW - 24) s++;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x0 + ZW / 2, FY0 + FH / 2);
  ctx.rotate(dir === 'up' ? -Math.PI / 2 : Math.PI / 2);
  ctx.drawImage(w.cv, w.x, w.y, w.w, w.h, Math.round(-w.w * s / 2), Math.round(-w.h * s / 2), w.w * s, w.h * s);
  ctx.restore();
}
