// What the ceremony's big screen shows, painted live in world coordinates (the canvas is already scaled to the world):
// the countdown, the MFL title as it animates on, "tonight", the list of awards, one award's name, "live now" and the
// winners card. Titles use the pixel font; anything with numbers or names uses a plain, readable font.
import { SCREEN, GOLD } from './stageArt.js';
import { drawPixelText, textLength } from './pixelFont.js';

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

function pixel(ctx, text, cx, y, s, color, alpha = 1, glowPx = 0) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  if (glowPx) { ctx.shadowColor = color; ctx.shadowBlur = glowPx; }
  drawPixelText((a, b, w, h) => ctx.fillRect(a, b, w, h), text, cx - textLength(text, s) / 2, y, s);
  ctx.restore();
}
function plain(ctx, text, cx, y, size, color, { weight = 700, alpha = 1, glowPx = 0, spacing = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px ${FONT}`; if (spacing) ctx.letterSpacing = `${spacing}px`;
  if (glowPx) { ctx.shadowColor = color; ctx.shadowBlur = glowPx; }
  ctx.fillText(text, cx, y); ctx.restore();
}

// The screen itself: a deep gradient with a slow light sweep, scanlines and a few sparkles.
function base(ctx, t, tint) {
  const { x, y, w, h } = SCREEN, g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, tint[0]); g.addColorStop(0.55, tint[1]); g.addColorStop(1, tint[2]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const sx = x + ((t * 22) % (w * 2.2)) - w * 0.6, sw = ctx.createLinearGradient(sx - 18, 0, sx + 18, 0);
  sw.addColorStop(0, 'rgba(255,255,255,0)'); sw.addColorStop(0.5, 'rgba(255,255,255,0.07)'); sw.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sw; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 22; i++) { const a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7)); ctx.fillStyle = `rgba(255,240,200,${a})`; ctx.fillRect(x + ((i * 37) % w), y + ((i * 23) % h), 0.5, 0.5); }
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let yy = y; yy < y + h; yy += 1) ctx.fillRect(x, yy, w, 0.35);
}
const TINTS = { gold: ['#1b1036', '#3c1652', '#5e1d3c'], red: ['#2a0610', '#5a0c1c', '#2a0610'], award: ['#120c2a', '#2a1450', '#4a1a48'] };

// mode: countdown | title | tonight | list | award | games | live | winners. d: the mode's details. p: its animation 0..1.
export function drawScreen(ctx, t, mode, d = {}, p = 1) {
  const { x, y, w, h } = SCREEN, cx = x + w / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  base(ctx, t, mode === 'live' ? TINTS.red : mode === 'award' || mode === 'games' ? TINTS.award : TINTS.gold);
  const season = d.season ?? '';
  if (mode === 'countdown') {
    pixel(ctx, 'MFL', cx, y + 4, 1.6, GOLD[3], 1, 6);
    pixel(ctx, `AWARD CEREMONY  SEASON ${season}`, cx, y + 17, 0.5, '#f4e9d0');
    plain(ctx, d.big || '', cx, y + 31, d.big && d.big.length > 12 ? 10.5 : 12, '#ffffff', { weight: 800, glowPx: 14 });
    plain(ctx, d.small || '', cx, y + 44, 3.6, '#e9c368', { weight: 600, spacing: 0.3 });
  } else if (mode === 'title') {
    const a = ease(p * 2), b = ease(p * 2 - 1), sc = 2.4 + (1 - a) * 1.6;
    pixel(ctx, 'MFL', cx, y + 9 - (sc - 2.4) * 3, sc, GOLD[3], a, 18 * a);
    ctx.fillStyle = `rgba(233,195,104,${b})`; ctx.fillRect(cx - 34 * b, y + 30, 68 * b, 0.6);
    pixel(ctx, 'AWARD CEREMONY', cx, y + 34, 0.75, '#ffffff', b);
    pixel(ctx, `SEASON ${season}`, cx, y + 42, 0.75, GOLD[4], b);
  } else if (mode === 'tonight') {
    pixel(ctx, 'TONIGHT', cx, y + 12, 1.1, '#ffffff', ease(p * 2), 8);
    pixel(ctx, `${d.count || 6} AWARDS REVEALED`, cx, y + 28, 0.75, GOLD[3], ease(p * 2 - 0.6));
  } else if (mode === 'list') {
    pixel(ctx, "TONIGHT'S AWARDS", cx, y + 4, 0.6, GOLD[3], 1, 4);
    (d.names || []).forEach((n, i) => { const k = ease(p * (d.names.length + 1) - i); pixel(ctx, n, cx + (1 - k) * 10, y + 12 + i * 6.4, 0.5, i === d.names.length - 1 ? GOLD[4] : '#f4e9d0', k); });
  } else if (mode === 'award') {
    const lines = d.lines || [], a = ease(p * 1.5);
    pixel(ctx, d.sub || '', cx, y + 6, 0.45, '#cfc3e8', a);
    lines.forEach((l, i) => pixel(ctx, l, cx, y + 17 + i * 11 - (lines.length - 1) * 2, 1, i === lines.length - 1 && lines.length > 1 ? GOLD[3] : '#ffffff', a, 6));
  } else if (mode === 'games') {
    pixel(ctx, 'GAME OF THE YEAR', cx, y + 4, 0.6, GOLD[3], 1, 4);
    (d.games || []).forEach((g, i) => { const k = ease(p * 4 - i * 0.8); plain(ctx, g, cx, y + 20 + i * 10, 5, d.win === i ? '#ffe08a' : '#ffffff', { weight: d.win === i ? 800 : 600, alpha: d.win != null && d.win !== i ? 0.35 : k }); });
  } else if (mode === 'live') {
    const pulse = 0.6 + 0.4 * Math.sin(t * 4);
    plain(ctx, '● LIVE NOW', cx, y + 18, 8, `rgba(255,90,90,${pulse})`, { weight: 800, glowPx: 16 });
    plain(ctx, 'Join the Discord call', cx, y + 34, 4.6, '#ffffff', { weight: 600 });
  } else if (mode === 'winners') {
    pixel(ctx, 'CONGRATULATIONS', cx, y + 12, 0.85, GOLD[3], 1, 6);
    pixel(ctx, `SEASON ${season} WINNERS`, cx, y + 26, 0.6, '#ffffff');
  }
  ctx.restore();
}
