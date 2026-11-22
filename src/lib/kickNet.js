// The kicking net behind the goal post on field goals and extra points. Two crew members in yellow safety vests stand at
// its poles and haul it up hand over hand on ropes, like raising a flag, so it's fully up a half second to a second before
// the kick. The ball flies into it, the mesh bulges and it drops. A while after the play they let it back down. It isn't
// shown on purpose: the camera only sees it if it happens to be looking. Crew skin tones are a 50/50 pick each game.
// Pixel art drawn here (crew) and with lines (net, poles, ropes), in the same style and scale as the players.
import { FX0, FX1, MID_Y } from './fieldLayout.js';
import { INK } from './uniformDraw.js';

const LEAN = 0.34, POLE_DY = 54, POLE_H = 106, NET_LOW = 34, NET_HIGH = 98, RISE = 2.4;
const SKIN = { dark: ['#6b4226', '#55331d'], light: ['#f0c48e', '#d9a670'] };
const ease = (k) => { const x = Math.max(0, Math.min(1, k)); return x * x * (3 - 2 * x); };

// After the kick scene is built (needs S.tKick). seed: the game's, for the crew's looks.
export function addNet(S, seed = 1) {
  if (S.tKick == null) return;
  const rnd = (k) => { let h = (seed ^ (k * 2654435761)) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return (h % 1000) / 1000; };
  const tUp = S.tKick - 0.5 - (S.play.n % 6) * 0.1, tStart = Math.max(0.2, tUp - RISE);
  S.net = { side: S.dir > 0 ? 1 : -1, tStart, tUp, tDown: (S.tEnd ?? S.tKick + 2) + 2.2, hit: null, crew: [rnd(1) < 0.5 ? 'dark' : 'light', rnd(2) < 0.5 ? 'dark' : 'light'] };
}

// How far up the net is right now (0 down, 1 up) and whether the crew is pulling.
function state(n, t) {
  if (t < n.tStart) return { k: 0, pull: false };
  if (t < n.tUp) return { k: ease((t - n.tStart) / (n.tUp - n.tStart)), pull: true };
  if (t < n.tDown) return { k: 1, pull: false };
  return { k: 1 - ease((t - n.tDown) / 2), pull: t < n.tDown + 2 };
}

// A crew member, front view: cap, face, yellow vest with silver reflective stripes, dark work pants. frame 0: arms down,
// 1: both hands up on the rope, 2: hands pulled down to the chest.
const crewCache = new Map();
function crew(tone, frame) {
  const key = `${tone}${frame}`; if (crewCache.has(key)) return crewCache.get(key);
  const W = 24, H = 54, px = new Array(W * H).fill(null), [sk, sk2] = SKIN[tone];
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = c; }, rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  rect(8, 8, 15, 11, '#1d2026'); rect(7, 12, 16, 12, '#121418'); set(11, 8, '#3a3f48');                                // cap and brim
  rect(8, 13, 15, 20, sk); rect(8, 13, 15, 13, sk2); set(10, 15, '#1a1410'); set(13, 15, '#1a1410'); rect(10, 18, 13, 18, sk2); rect(8, 19, 8, 20, sk2); rect(15, 19, 15, 20, sk2);   // face
  rect(10, 21, 13, 22, sk2);                                                                                           // neck
  rect(6, 23, 17, 36, '#2b3a5c');                                                                                      // navy shirt
  rect(6, 23, 17, 36, '#d6f23a'); rect(10, 23, 13, 25, '#2b3a5c'); rect(6, 23, 6, 36, '#b9d321'); rect(17, 23, 17, 36, '#a8c01c');   // the vest, open at the neck
  rect(6, 29, 17, 29, '#d7dde3'); rect(6, 33, 17, 33, '#d7dde3'); rect(8, 23, 8, 28, '#d7dde3'); rect(15, 23, 15, 28, '#d7dde3');   // reflective stripes
  rect(7, 37, 16, 37, '#1a1b1f'); rect(7, 38, 11, 49, '#3b3e46'); rect(12, 38, 16, 49, '#34373e'); rect(11, 42, 12, 49, '#26282d');   // belt, pants
  rect(6, 50, 11, 52, '#121212'); rect(12, 50, 17, 52, '#121212'); rect(6, 52, 17, 52, '#2c2c30');                    // boots
  if (frame === 0) { rect(4, 24, 5, 32, '#2b3a5c'); rect(18, 24, 19, 32, '#2b3a5c'); rect(4, 33, 5, 35, sk); rect(18, 33, 19, 35, sk); }
  else if (frame === 1) { rect(6, 9, 7, 23, '#2b3a5c'); rect(16, 9, 17, 23, '#2b3a5c'); rect(8, 4, 15, 7, sk); rect(8, 7, 15, 7, sk2); }   // reaching up the rope
  else { rect(4, 24, 5, 28, '#2b3a5c'); rect(18, 24, 19, 28, '#2b3a5c'); rect(6, 27, 9, 28, '#2b3a5c'); rect(14, 27, 17, 28, '#2b3a5c'); rect(10, 25, 13, 28, sk); }   // hauled down
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = px[y * W + x];
    if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); continue; }
    if ((x > 0 && px[y * W + x - 1]) || (x < W - 1 && px[y * W + x + 1]) || (y > 0 && px[(y - 1) * W + x]) || (y < H - 1 && px[(y + 1) * W + x])) { ctx.fillStyle = INK; ctx.fillRect(x, y, 1, 1); }
  }
  cv.hands = frame === 1 ? [12, 5] : frame === 2 ? [12, 26] : [5, 34]; crewCache.set(key, cv);
  return cv;
}

// Draws it (call before the players, it's behind them). cam: the camera; px: screen pixels per world pixel; sp: per sprite pixel.
export function drawNet(ctx, S, cam, px, sp) {
  const n = S.net; if (!n) return;
  const t = S.t, { k, pull } = state(n, t), out = n.side, gx = (out > 0 ? FX1 - 2 : FX0 - 1) + out * 12, cw = ctx.canvas.width, ch = ctx.canvas.height;
  const P = (dy, h) => [((gx + out * h * LEAN) - cam.x) * px + cw / 2, ((MID_Y + dy - h) - cam.y) * px + ch / 2];   // a point dy across and h up
  const line = (a, b, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, w * px); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  const top = NET_LOW + (NET_HIGH - NET_LOW) * k, bulge = n.hit != null && t > n.hit ? Math.max(0, 1 - (t - n.hit) / 0.8) * Math.sin((t - n.hit) * 14) * 5 : 0;
  ctx.save();
  [-POLE_DY, POLE_DY].forEach((dy) => { line(P(dy, 0), P(dy, POLE_H), 3.2, INK); line(P(dy, 0), P(dy, POLE_H), 2, '#8a929c'); });   // the poles
  if (k > 0.02) {   // the mesh: a grid between the poles from just over the crossbar up to how far it's been raised
    const rows = Math.max(1, Math.round((top - NET_LOW) / 5)), cols = 18;
    ctx.globalAlpha = 0.85;
    for (let r = 0; r <= rows; r++) { const h = NET_LOW + ((top - NET_LOW) * r) / rows; line(P(-POLE_DY, h), P(0, h + bulge), 0.7, '#f2f6f7'); line(P(0, h + bulge), P(POLE_DY, h), 0.7, '#f2f6f7'); }
    for (let c = 0; c <= cols; c++) { const dy = -POLE_DY + (2 * POLE_DY * c) / cols, b = bulge * (1 - Math.abs(dy) / POLE_DY); line(P(dy, NET_LOW), P(dy, top + b), 0.7, '#f2f6f7'); }
    ctx.globalAlpha = 1;
    line(P(-POLE_DY, top), P(POLE_DY, top), 2.2, INK); line(P(-POLE_DY, top), P(POLE_DY, top), 1.4, '#ffffff');                                                    // the top rope
  }
  line(P(-POLE_DY, NET_LOW), P(POLE_DY, NET_LOW), 2, '#d9dfe3');                                                // the bottom edge (bundled up while it's down)
  [-POLE_DY - 9, POLE_DY + 9].forEach((dy, i) => {   // the crew at the foot of each pole, rope from their hands up over the pulley (hand over hand, out of step)
    const frame = pull ? ((Math.floor(t / 0.28) + i) % 2 ? 1 : 2) : k > 0.5 ? 2 : 0;
    const img = crew(n.crew[i], frame), [fx, fy] = P(dy, 0), X = Math.round(fx - 12 * sp), Y = Math.round(fy - 52 * sp);
    const hand = [X + img.hands[0] * sp, Y + img.hands[1] * sp], pul = P(Math.sign(dy) * POLE_DY, POLE_H);
    line(hand, pul, 0.7, '#c9a77a'); line(pul, P(Math.sign(dy) * POLE_DY, top), 0.7, '#c9a77a');
    ctx.drawImage(img, X, Y, Math.round(img.width * sp), Math.round(img.height * sp));
  });
  ctx.restore();
}
