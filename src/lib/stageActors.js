// The award show's nominees on stage, in world units at half size (the stage art is twice their resolution): players
// are their Drip-tab sprites in their team's home uniform, coaches their coach art. They walk on carrying a little
// trophy and stand on their marks; after the reveal the winner steps to the front and keeps lifting his trophy overhead,
// and the other two walk off into the wings. Name plates are drawn after the lighting, at screen resolution.
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

// Where nominee i is at time t. kind: enter | stand | reveal. win: the winner's index. hit: when the winner is revealed.
function placeOf(i, t, kind, win, hit) {
  const mark = MARKS[i];
  if (kind === 'enter') {
    const start = 0.4 + i * 0.5, from = i === 2 ? 296 : 24 - (i === 1 ? 14 : 0), dur = Math.abs(mark - from) / 34, k = ease((t - start) / dur);
    return { x: from + (mark - from) * k, y: FOOT, walking: k > 0 && k < 1, face: from < mark ? 1 : -1, a: t < start ? 0 : Math.min(1, (t - start) * 3), t };
  }
  if (kind !== 'reveal' || win == null || t < hit) return { x: mark, y: FOOT, a: 1, t };
  const u = t - hit;
  if (i === win) {
    const k = ease(u / 0.9);
    return { x: mark + (160 - mark) * k, y: FOOT + 5 * k, walking: k > 0 && k < 1 && mark !== 160, face: mark < 160 ? 1 : -1, lift: u > 1 ? u - 1 : -1, a: 1, t };
  }
  const side = mark < 160 || (mark === 160 && MARKS[win] > 160) ? -1 : 1, start = 0.6 + (i === 1 ? 0.35 : 0);
  const x = mark + side * Math.max(0, u - start) * 32, gone = side < 0 ? (x - 70) / 18 : (250 - x) / 18;
  return { x, y: FOOT, walking: u > start, face: side, a: Math.max(0, Math.min(1, gone)), t };
}

function drawOne(ctx, n, at) {
  if (at.a <= 0) return;
  ctx.save(); ctx.globalAlpha = at.a;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(at.x, at.y + 0.3, 5, 1.1, 0, 0, Math.PI * 2); ctx.fill();   // shadow
  const lifting = at.lift >= 0, ph = lifting ? (at.lift % 1.8) / 1.8 : 0, up = lifting ? ease(Math.min(1, Math.sin(ph * Math.PI) * 1.35)) : 0;   // up, a held beat, down
  let hx = at.x + 3.5, hy = at.y - 12;
  if (n.coachImg) {
    const img = n.coachImg, bob = at.walking ? Math.abs(Math.sin(at.t * 9)) * 0.6 : 0;
    if (img.complete && img.width) ctx.drawImage(img, at.x - img.width / 4, at.y - img.height / 2 - bob, img.width / 2, img.height / 2);
    if (at.walking) hx = at.x + 3 * (at.face || 1);
  } else {
    const view = at.walking ? 'side' : 'front', pose = lifting && up > 0.55 ? 'cheer' : at.walking ? 'run' : 'stand';
    const c = sprite(n.look, view, pose, at.walking ? Math.floor(at.t * 7) % 4 : 0, at.face || 1);
    ctx.drawImage(c, at.x - c.width / 4, at.y - c.height / 2 + 1, c.width / 2, c.height / 2);
    if (at.walking) { hx = at.x + 3 * (at.face || 1); hy = at.y - 13; }
  }
  if (lifting) { hx = at.x + (1 - up) * 3.5; hy = at.y - 12 - up * 17; }   // the trophy goes up overhead and back, again and again
  drawCup(ctx, hx, hy, lifting ? 0.55 : 0.4);
  ctx.restore();
}

// nominees: from makeNominee. Returns where each one is (for the name plates).
export function drawNominees(ctx, nominees, t, kind, win, hit = 0) {
  const places = nominees.map((n, i) => placeOf(i, t, kind, win, hit));
  places.map((at, i) => [at, i]).sort((a, b) => a[0].y - b[0].y).forEach(([at, i]) => drawOne(ctx, nominees[i], at));
  return places;
}

// Name plates under each nominee with their team's logo, at screen resolution. xf: from camXf. logos: teamId -> Image.
// only: draw just this nominee's plate (the winner's, after the reveal).
export function drawPlates(ctx, nominees, places, xf, alpha = 1, logos = {}, only = null) {
  const { s, X, Y } = xf;
  nominees.forEach((n, i) => {
    const at = places[i]; if (!at || at.a <= 0.05 || at.walking || alpha <= 0 || (only != null && i !== only)) return;
    const w = 22.5 * s, h = 6.4 * s, img = only != null ? logos[n.entry.team] : null, x = X(at.x) - w / 2 + (img ? 2 * s : 0), y = Y(at.y + 2.5);   // the logo rides on a lone winner's plate
    ctx.save(); ctx.globalAlpha = Math.min(at.a, alpha);
    ctx.fillStyle = 'rgba(10,6,14,0.85)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 1.4 * s); ctx.fill();
    ctx.fillStyle = n.color; ctx.fillRect(x, y, 0.9 * s, h);
    ctx.strokeStyle = 'rgba(240,204,112,0.5)'; ctx.lineWidth = Math.max(1, 0.25 * s); ctx.stroke();
    if (img?.complete && img.width) {   // the team logo badge on the plate's left end
      const ls = 7.6 * s, lx = x - ls * 0.62, ly = y + h / 2 - ls / 2;
      ctx.fillStyle = 'rgba(10,6,14,0.9)'; ctx.beginPath(); ctx.arc(lx + ls / 2, ly + ls / 2, ls * 0.56, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = n.color; ctx.lineWidth = Math.max(1, 0.35 * s); ctx.stroke();
      ctx.imageSmoothingEnabled = false; ctx.drawImage(img, lx + ls * 0.12, ly + ls * 0.12, ls * 0.76, ls * 0.76);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.font = `800 ${2.3 * s}px 'Inter', system-ui, sans-serif`; ctx.fillText(n.entry.name, x + w / 2 + (img ? 1.4 : 0.45) * s, y + h * 0.37, w - (img ? 5 : 2.5) * s);
    ctx.fillStyle = '#f0cc70'; ctx.font = `600 ${1.55 * s}px 'Inter', system-ui, sans-serif`;
    ctx.fillText([n.entry.pos, n.teamName].filter((v, k, a) => v && a.indexOf(v) === k).join(' · '), x + w / 2 + (img ? 1.4 : 0.45) * s, y + h * 0.75, w - (img ? 5 : 2.5) * s);
    ctx.restore();
  });
}

// A team-logo badge floating beside each nominee's shoulder, at screen resolution.
export function drawBadges(ctx, nominees, places, xf, alpha = 1, logos = {}, only = null) {
  const { s, X, Y } = xf;
  nominees.forEach((n, i) => {
    const at = places[i], img = logos[n.entry.team];
    if (!at || at.a <= 0.05 || alpha <= 0 || !img?.complete || !img.width || (only != null && i !== only)) return;
    const r = 3.3 * s, cx = X(at.x + 9), cy = Y(at.y - 20 + Math.sin(at.t * 2 + i) * 0.4);
    ctx.save(); ctx.globalAlpha = Math.min(at.a, alpha);
    ctx.fillStyle = 'rgba(10,6,14,0.88)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = n.color; ctx.lineWidth = Math.max(1, 0.32 * s); ctx.stroke();
    ctx.imageSmoothingEnabled = false; ctx.drawImage(img, cx - r * 0.72, cy - r * 0.72, r * 1.44, r * 1.44);
    ctx.restore();
  });
}
