// The award show's nominees on stage, in world pixels: players are their Drip-tab sprites in their team's home uniform,
// coaches their coach art. They walk on carrying a little trophy, stand on their marks, and the winner steps forward and
// raises a big one under falling confetti. Name plates are drawn after the lighting, at screen resolution.
import { sprite, buildOf } from './fieldSprite.js';
import { looksFor } from './portraitLooks.js';
import { drawCup } from './stageProps.js';
import { MARKS } from './stageArt.js';

const FOOT = 124, ease = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

// entry: { id, name, team, pos }. player: the real player (or null). kit: home uniform colors. coachImg: an Image (coaches).
export function makeNominee(entry, { player, kit, design, coachImg, team }) {
  const p = player || { id: entry.id, nationality: 'USA' };
  const look = coachImg ? null : { key: `show|${entry.id}|${team?.id}`, colors: kit, face: looksFor(p), number: p.number ?? 1, design, ...buildOf(p) };
  return { entry, look, coachImg, color: team?.color || '#c79a3a', teamName: team?.name || '' };
}

// Where nominee i is at time t of a slide. kind: enter | stand | winner. win: the winner's index.
function placeOf(i, t, kind, win) {
  const mark = MARKS[i];
  if (kind === 'enter') {
    const start = 0.35 + i * 0.45, k = ease((t - start) / 2.4), from = i === 2 ? 300 : -20 + (i === 1 ? -26 : 0);
    const x = from + (mark - from) * k, walking = k > 0 && k < 1;
    return { x, y: FOOT, walking, face: from < mark ? 1 : -1, a: t < start ? 0 : 1, t };
  }
  if (kind === 'winner' && win != null) {
    const step = ease((t - 1.3) / 0.8);
    if (i === win) return { x: mark + (160 - mark) * step, y: FOOT + 7 * step, cheer: t > 2, a: 1, walking: step > 0 && step < 1, face: mark < 160 ? 1 : -1, t };
    return { x: mark + (mark < 160 ? -14 : mark > 160 ? 14 : -26) * step, y: FOOT - 2 * step, a: 1 - 0.45 * step, face: 1, t };
  }
  return { x: mark, y: FOOT, a: 1, t };
}

function drawOne(ctx, n, at) {
  if (at.a <= 0) return;
  ctx.save(); ctx.globalAlpha = at.a;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(at.x, at.y + 0.5, 9, 2, 0, 0, Math.PI * 2); ctx.fill();   // shadow
  let handX = at.x + 7, handY = at.y - 24;
  if (n.coachImg) {
    const bob = at.walking ? Math.abs(Math.sin(at.t * 9)) * 1.2 : 0, img = n.coachImg;
    if (img.complete && img.width) ctx.drawImage(img, Math.round(at.x - img.width / 2), Math.round(at.y - img.height - bob));
    if (at.cheer) { handX = at.x; handY = at.y - 58; }
  } else {
    const view = at.walking ? 'side' : 'front', pose = at.cheer ? 'cheer' : at.walking ? 'run' : 'stand';
    const frame = at.walking ? Math.floor(at.t * 7) % 4 : at.cheer ? Math.floor(at.t * 3) % 2 : 0;
    const c = sprite(n.look, view, pose, frame, at.face || 1);
    ctx.drawImage(c, Math.round(at.x - c.width / 2), Math.round(at.y - c.height + 2));
    if (at.walking) { handX = at.x + 6 * (at.face || 1); handY = at.y - 26; }
    if (at.cheer) { handX = at.x; handY = at.y - 56; }
  }
  drawCup(ctx, Math.round(handX), Math.round(handY), at.cheer ? 1.5 : 1);
  ctx.restore();
}

const CONFETTI = Array.from({ length: 140 }, (_, i) => ({ x: (i * 47.7) % 220 + 50, d: (i * 0.37) % 2.2, v: 14 + (i * 7) % 16, w: (i * 13) % 5, c: ['#e9c368', '#fff0b0', '#ffffff', '#c79a3a', '#d23a44'][i % 5] }));

// nominees: from makeNominee. kind: enter | stand | winner. Returns where each one is (for the name plates).
export function drawNominees(ctx, nominees, t, kind, win) {
  const places = nominees.map((n, i) => placeOf(i, t, kind, win));
  places.map((at, i) => [at, i]).sort((a, b) => a[0].y - b[0].y).forEach(([at, i]) => drawOne(ctx, nominees[i], at));
  if (kind === 'winner' && t > 1.9) for (const c of CONFETTI) {   // confetti over the winner
    const tt = t - 1.9 - c.d; if (tt < 0) continue;
    const y = -6 + tt * c.v * 2.2; if (y > 132) continue;
    ctx.fillStyle = c.c; ctx.fillRect(c.x + Math.sin(tt * 3 + c.w) * 6, y, Math.sin(tt * 8 + c.w) > 0 ? 1.4 : 0.6, 1.4);
  }
  return places;
}

// Name plates under each nominee, at screen resolution. xf: from camXf.
export function drawPlates(ctx, nominees, places, xf, win, alpha = 1) {
  const { s, X, Y } = xf;
  nominees.forEach((n, i) => {
    const at = places[i]; if (!at || at.a <= 0.05 || at.walking || alpha <= 0) return;
    const w = 31 * s, h = 8.6 * s, x = X(at.x) - w / 2, y = Y(at.y + 4);
    ctx.save(); ctx.globalAlpha = Math.min(at.a, alpha) * (win != null && i !== win ? 0.6 : 1);
    ctx.fillStyle = 'rgba(10,6,14,0.82)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 2 * s); ctx.fill();
    ctx.fillStyle = n.color; ctx.fillRect(x, y, 1.2 * s, h);
    ctx.strokeStyle = i === win ? '#e9c368' : 'rgba(233,195,104,0.35)'; ctx.lineWidth = Math.max(1, 0.3 * s); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.font = `800 ${3.1 * s}px 'Inter', system-ui, sans-serif`; ctx.fillText(n.entry.name, X(at.x) + 0.6 * s, y + h * 0.36, w - 3 * s);
    ctx.fillStyle = '#e9c368'; ctx.font = `600 ${2.1 * s}px 'Inter', system-ui, sans-serif`;
    ctx.fillText([n.entry.pos, n.teamName].filter(Boolean).filter((v, k, a) => a.indexOf(v) === k).join(' · '), X(at.x) + 0.6 * s, y + h * 0.74, w - 3 * s);
    ctx.restore();
  });
}
