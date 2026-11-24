// What the ceremony's big screen shows, painted live in world units (the canvas is already scaled to the world), in the
// Craft Bowl's colors with scanlines over it: the countdown, the MFL title, "tonight", the list of awards, an award's
// title card, its finalists stacked (players and coaches with logos and stat lines; games with both logos, the final
// score and the week), "and the winner is..." during the drum roll, the winner, and the night's winners.
import { SCREEN } from './stageArt.js';

const SERIF = "'Cinzel', 'Times New Roman', serif", SANS = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

function text(ctx, str, x, y, size, { font = SERIF, weight = 700, color = '#fff', gold = false, alpha = 1, glow = 0, spacing = 0, align = 'center', maxW } = {}) {
  if (alpha <= 0 || !str) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.font = `${weight} ${size}px ${font}`;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  if (gold) { const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2); g.addColorStop(0, '#fff6cf'); g.addColorStop(0.45, '#f0cc70'); g.addColorStop(1, '#a87a26'); ctx.fillStyle = g; } else ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = gold ? 'rgba(240,204,112,0.6)' : color; ctx.shadowBlur = glow; }
  ctx.fillText(str, x, y, maxW); ctx.restore();
}
function logo(ctx, img, cx, cy, size, alpha = 1) {
  if (!img?.complete || !img.width || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false; ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size); ctx.restore();
}
function card(ctx, x, y, w, h, th, alpha) {   // a glassy row card with a theme-colored edge
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 1.5); ctx.fill();
  ctx.strokeStyle = `rgba(${th.rgb},0.7)`; ctx.lineWidth = 0.35; ctx.stroke();
  ctx.fillStyle = th.primary; ctx.fillRect(x, y + 1, 0.7, h - 2); ctx.restore();
}

function base(ctx, t, th) {   // the screen: Craft Bowl gradient, a slow light sweep, sparkles
  const { x, y, w, h } = SCREEN, g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, th.screen[0]); g.addColorStop(0.55, th.screen[1]); g.addColorStop(1, th.screen[2]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const r = ctx.createRadialGradient(x + w / 2, y + h * 0.42, 2, x + w / 2, y + h * 0.42, w * 0.55);
  r.addColorStop(0, `rgba(${th.rgb},0.28)`); r.addColorStop(1, `rgba(${th.rgb},0)`); ctx.fillStyle = r; ctx.fillRect(x, y, w, h);
  const sx = x + ((t * 20) % (w * 2.4)) - w * 0.7, sw = ctx.createLinearGradient(sx - 20, 0, sx + 20, 0);
  sw.addColorStop(0, 'rgba(255,255,255,0)'); sw.addColorStop(0.5, 'rgba(255,255,255,0.06)'); sw.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sw; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(255,240,200,${0.12 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7))})`; ctx.fillRect(x + ((i * 37) % w), y + ((i * 23) % h), 0.5, 0.5); }
}
function scan(ctx) { const { x, y, w, h } = SCREEN; ctx.fillStyle = 'rgba(0,0,0,0.17)'; for (let yy = y; yy < y + h; yy += 1) ctx.fillRect(x, yy, w, 0.4); }

// mode: countdown | title | tonight | list | intro | finalists | drum | winner | winners | live | after. d: its details
// (season, logos, lines, rows, winner...). p: its animation 0..1. th: showTheme.
export function drawScreen(ctx, t, mode, d = {}, p = 1, th) {
  const { x, y, w, h } = SCREEN, cx = x + w / 2, L = d.logos || {};
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  base(ctx, t, th);
  if (mode === 'countdown') {
    text(ctx, 'MFL AWARD CEREMONY', cx, y + 11, 4.6, { gold: true, spacing: 0.9, glow: 4 });
    text(ctx, d.big, cx, y + 28, d.big && d.big.length > 12 ? 12 : 14, { font: SANS, weight: 800, glow: 10, maxW: w - 10 });
    text(ctx, d.small, cx, y + 44, 3.6, { font: SANS, weight: 700, color: th.accent, spacing: 0.4, maxW: w - 10 });
    text(ctx, `SEASON ${d.season}`, cx, y + 51, 3.2, { spacing: 1, color: '#e8dcc0' });
  } else if (mode === 'title') {
    const a = ease(p * 1.8), b = ease(p * 1.8 - 0.9), sc = 1 + (1 - a) * 0.35;
    ctx.save(); ctx.translate(cx, y + 24); ctx.scale(sc, sc); text(ctx, 'MFL', 0, 0, 22, { weight: 900, gold: true, alpha: a, glow: 18 * a, spacing: 2 }); ctx.restore();
    ctx.fillStyle = `rgba(240,204,112,${b})`; ctx.fillRect(cx - 36 * b, y + 37, 72 * b, 0.4);
    text(ctx, 'AWARD CEREMONY', cx, y + 43, 6, { spacing: 1.2, alpha: b });
    text(ctx, `SEASON ${d.season}`, cx, y + 51, 4, { gold: true, spacing: 1.5, alpha: b });
  } else if (mode === 'tonight') {
    text(ctx, 'TONIGHT', cx, y + 24, 14, { weight: 900, gold: true, glow: 10, alpha: ease(p * 2), spacing: 1.5 });
    text(ctx, `${d.count} awards revealed`, cx, y + 39, 5.4, { font: SANS, weight: 600, color: '#f4ead2', alpha: ease(p * 2 - 0.8), spacing: 0.4 });
  } else if (mode === 'list') {
    text(ctx, "TONIGHT'S AWARDS", cx, y + 7, 4.4, { gold: true, spacing: 1, glow: 3 });
    const many = (d.names || []).length > 6, step = many ? 5.3 : 7;   // 8 awards still fit
    (d.names || []).forEach((n, i) => { const k = ease(p * (d.names.length + 1) - i), last = i === d.names.length - 1;
      text(ctx, n, cx + (1 - k) * 8, y + 15 + i * step, last ? (many ? 4.2 : 5) : many ? 3.6 : 4.4, { gold: last, color: '#fff', alpha: k, spacing: 0.4, glow: last ? 4 : 0 }); });
  } else if (mode === 'intro') {
    text(ctx, d.lead, cx, y + 13, 3.8, { font: SANS, weight: 800, color: th.accent, spacing: 1.6, alpha: ease(p * 2) });
    (d.lines || []).forEach((l, i) => text(ctx, l, cx, y + 27 + i * 12, 10, { weight: 900, gold: true, glow: 8, alpha: ease(p * 2 - 0.4 - i * 0.3), spacing: 0.6, maxW: w - 8 }));
  } else if (mode === 'finalists') {
    text(ctx, d.title, cx, y + 6.5, 4, { gold: true, spacing: 0.8 });
    (d.rows || []).forEach((r, i) => {
      const k = ease(p * 3.2 - i * 0.7), ry = y + 12 + i * 15;
      card(ctx, x + 10 + (1 - k) * 12, ry, w - 20, 12.5, th, k);
      if (r.game) {
        logo(ctx, L[r.away], cx - 34, ry + 6.25, 9, k); logo(ctx, L[r.home], cx + 34, ry + 6.25, 9, k);
        text(ctx, r.score, cx, ry + 5.2, 6.4, { font: SANS, weight: 800, alpha: k });
        text(ctx, r.when, cx, ry + 10, 2.6, { font: SANS, weight: 700, color: th.accent, spacing: 0.5, alpha: k });
      } else {
        logo(ctx, L[r.team], x + 20, ry + 6.25, 9, k);
        text(ctx, r.name, x + 28, ry + 4.8, 5.2, { font: SANS, weight: 800, align: 'left', alpha: k, maxW: w - 46 });
        text(ctx, r.sub, x + 28, ry + 9.6, 2.9, { font: SANS, weight: 600, color: th.accent, align: 'left', alpha: k, maxW: w - 46 });
      }
    });
  } else if (mode === 'drum') {
    const dots = '.'.repeat(1 + (Math.floor(t * 2.5) % 3)), pulse = 0.75 + 0.25 * Math.sin(t * 9);
    text(ctx, d.title, cx, y + 17, 4, { gold: true, spacing: 0.8, alpha: 0.9 });
    text(ctx, 'And the winner is', cx, y + 31, 8, { weight: 700, glow: 10 * pulse, alpha: ease(p * 3), maxW: w - 16 });
    text(ctx, dots, cx, y + 41, 8, { weight: 900, gold: true, alpha: ease(p * 3) });
  } else if (mode === 'winner') {
    const r = d.winner || {}, a = ease(p * 2.2);
    text(ctx, d.title, cx, y + 7, 4, { gold: true, spacing: 1, alpha: a });
    if (r.game) {
      logo(ctx, L[r.away], cx - 34, y + 26, 18, a); logo(ctx, L[r.home], cx + 34, y + 26, 18, a);
      text(ctx, r.score, cx, y + 26, 9, { font: SANS, weight: 900, glow: 8, alpha: a });
      text(ctx, r.name, cx, y + 42, 5.5, { weight: 700, alpha: a, maxW: w - 12 }); text(ctx, r.when, cx, y + 50, 3.2, { font: SANS, weight: 700, color: th.accent, spacing: 0.6, alpha: a });
    } else {
      logo(ctx, L[r.team], cx, y + 21, 15, a);
      text(ctx, r.name, cx, y + 37, 10, { weight: 900, gold: true, glow: 10, alpha: a, maxW: w - 10 });
      text(ctx, r.sub, cx, y + 47, 3.6, { font: SANS, weight: 700, color: '#f4ead2', alpha: a, maxW: w - 12 });
    }
    if (p < 0.4) { ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - p / 0.4)})`; ctx.fillRect(x, y, w, h); }   // the reveal flash
  } else if (mode === 'winners') {
    text(ctx, `SEASON ${d.season} WINNERS`, cx, y + 7, 5, { weight: 900, gold: true, spacing: 1, glow: 4 });
    const many = (d.list || []).length > 6, step = many ? 5.3 : 7;
    (d.list || []).forEach((r, i) => { const k = ease(p * 7 - i * 0.8), ry = y + 15 + i * step;
      text(ctx, r.award, cx - 2, ry, many ? 2.4 : 2.7, { font: SANS, weight: 800, color: th.accent, align: 'right', spacing: 0.5, alpha: k });
      text(ctx, r.name, cx + 2, ry, many ? 3.7 : 4.3, { weight: 700, align: 'left', alpha: k, maxW: w / 2 - 6 }); });
  } else if (mode === 'live') {
    const pulse = 0.6 + 0.4 * Math.sin(t * 4);
    text(ctx, '● LIVE NOW', cx, y + 24, 10, { font: SANS, weight: 900, color: `rgba(255,90,90,${pulse})`, glow: 14 });
    text(ctx, 'Join the Discord call', cx, y + 38, 4.8, { font: SANS, weight: 700 });
  } else if (mode === 'after') {
    text(ctx, 'CONGRATULATIONS', cx, y + 24, 9, { weight: 900, gold: true, glow: 8, spacing: 0.8 });
    text(ctx, `SEASON ${d.season} WINNERS`, cx, y + 37, 4.6, { spacing: 1.2 });
  }
  scan(ctx);
  ctx.restore();
}
