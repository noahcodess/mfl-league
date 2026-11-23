// The ceremony stage as pixel art (320x180), drawn once: a gilded proscenium with fluted columns and a crest, a red
// velvet valance and tied-back curtains, the big screen ("MFL / AWARD CEREMONY / SEASON 8"), a wood stage floor in
// perspective, the podium, two trophy stands and the footlights. The house around it comes from stageHouse.
import { W, H, rect, drawWalls, drawBalconies, drawAudience } from './stageHouse.js';
import { drawPixelText, textLength } from './pixelFont.js';

export const STAGE = { x0: 60, x1: 260, top: 24, floorBack: 98, floorFront: 128, lip: 132, vp: [160, 60] };
export const SCREEN = { x: 102, y: 32, w: 116, h: 50 };
const GOLD = ['#5a4116', '#8a6a2a', '#c79a3a', '#e9c368', '#fff0b0'];   // shadow ... shine

const words = (ctx, text, x, y, s, c) => drawPixelText((a, b, w, h) => rect(ctx, c, a, b, w, h), text, x, y, s);
const centered = (ctx, text, cx, y, s, c, shadow) => {
  const x = Math.round(cx - textLength(text, s) / 2);
  if (shadow) words(ctx, text, x + s, y + s, s, shadow);
  words(ctx, text, x, y, s, c);
};

function floor(ctx) {
  const { x0, x1, floorBack: yb, lip, vp } = STAGE, fx0 = 34, fx1 = W - 34;
  for (let y = yb; y <= lip; y++) {
    const t = (y - yb) / (lip - yb), l = Math.round(x0 + 14 - (x0 + 14 - fx0) * t), r = Math.round(x1 - 14 + (fx1 - x1 + 14) * t);
    for (let x = l; x <= r; x++) {
      const mid = 1 - Math.abs(x - 160) / 140, warm = 0.35 + 0.65 * mid * (0.5 + 0.5 * t);
      ctx.fillStyle = `rgb(${Math.round(70 + 70 * warm)},${Math.round(38 + 38 * warm)},${Math.round(18 + 16 * warm)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.save(); ctx.beginPath(); ctx.moveTo(x0 + 14, yb); ctx.lineTo(x1 - 14, yb); ctx.lineTo(fx1, lip); ctx.lineTo(fx0, lip); ctx.closePath(); ctx.clip();
  ctx.strokeStyle = '#3a1f0e'; ctx.lineWidth = 1;   // planks run to the vanishing point
  for (let i = -10; i <= 10; i++) {
    const xf = 160 + i * 13, xb = vp[0] + (xf - vp[0]) * ((yb - vp[1]) / (lip - vp[1]));
    ctx.beginPath(); ctx.moveTo(Math.round(xb) + 0.5, yb); ctx.lineTo(Math.round(xf) + 0.5, lip); ctx.stroke();
  }
  for (const y of [104, 111, 119]) rect(ctx, '#4a2a14', 0, y, W, 1);   // plank ends
  ctx.restore();
  rect(ctx, GOLD[3], fx0 - 4, lip, fx1 - fx0 + 8, 1); rect(ctx, GOLD[2], fx0 - 4, lip + 1, fx1 - fx0 + 8, 1);   // gilded lip
  rect(ctx, '#140608', fx0 - 4, lip + 2, fx1 - fx0 + 8, 5);
  for (let x = fx0; x <= fx1; x += 10) { rect(ctx, '#ffdd88', x, lip + 3, 3, 1); rect(ctx, '#6a4a1a', x, lip + 4, 3, 1); }   // footlights
}
function backdrop(ctx) {
  const { x0, x1, top, floorBack } = STAGE, g = ctx.createLinearGradient(0, top, 0, floorBack);
  g.addColorStop(0, '#0d0a1e'); g.addColorStop(1, '#22123a');
  ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, floorBack - top);
  for (let x = x0; x < x1; x += 6) rect(ctx, '#1a1230', x, top, 1, floorBack - top);   // cyclorama pleats
  const { x, y, w, h } = SCREEN;   // the big screen
  rect(ctx, '#050507', x - 3, y - 3, w + 6, h + 6); rect(ctx, '#2a2a33', x - 2, y - 2, w + 4, h + 4);
  const s = ctx.createLinearGradient(0, y, 0, y + h);
  s.addColorStop(0, '#1a0f3d'); s.addColorStop(0.6, '#3b1650'); s.addColorStop(1, '#5c1d3f');
  ctx.fillStyle = s; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 26; i++) rect(ctx, '#ffffff30', x + ((i * 37) % w), y + ((i * 23) % h), 1, 1);   // sparkle dots
  for (let yy = y; yy < y + h; yy += 2) rect(ctx, '#00000022', x, yy, w, 1);   // scanlines
  rect(ctx, '#3b3b48', x + w / 2 - 6, y + h + 3, 12, floorBack - (y + h + 3));   // the screen's stand
}
export function screenText(ctx, season) {
  const { x, y, w } = SCREEN, cx = x + w / 2;
  centered(ctx, 'MFL', cx, y + 6, 3, GOLD[3], '#2a1405');
  rect(ctx, GOLD[2], cx - 30, y + 29, 60, 1);
  centered(ctx, 'AWARD CEREMONY', cx, y + 32, 1, '#ffffff', '#20103a');
  centered(ctx, `SEASON ${season}`, cx, y + 41, 1, GOLD[4], '#20103a');
}

function curtains(ctx) {
  const { x0, x1, top, floorBack } = STAGE;
  const drape = (from, to, dir) => {
    for (let x = from; x !== to; x += dir) {
      const k = Math.abs(x - from), f = Math.sin(k * 1.1), c = f > 0.6 ? '#d23a44' : f > 0 ? '#a01d2a' : f > -0.6 ? '#7a1220' : '#520a14';
      const hem = floorBack + 2 + Math.round(k < 6 ? 0 : (k - 6) * 0.2), tie = 70 + Math.round(k * 0.6);
      const waist = Math.max(0, Math.round((22 - k) * 0.5));   // gathered in at the tie-back
      rect(ctx, c, x, top, 1, tie - top); rect(ctx, c, x + dir * Math.round(waist * 0.15), tie, 1, hem - tie);
    }
  };
  drape(x0, x0 + 26, 1); drape(x1 - 1, x1 - 27, -1);
  for (const [a, b] of [[x0, x0 + 22], [x1 - 22, x1]]) { rect(ctx, GOLD[3], a, 76, b - a, 2); rect(ctx, GOLD[1], a, 78, b - a, 1); }   // gold tie-backs
  for (let x = x0; x < x1; x++) {   // the valance: scalloped swags with a gold fringe
    const u = ((x - x0) % 40) / 40, sag = Math.round(7 * Math.sin(u * Math.PI));
    const f = Math.sin((x - x0) * 0.7);
    rect(ctx, f > 0.3 ? '#b02634' : f > -0.3 ? '#8a1726' : '#5e0f19', x, top, 1, 6 + sag);
    rect(ctx, (x % 2) ? GOLD[3] : GOLD[2], x, top + 6 + sag, 1, 2);
    if (x % 3 === 0) rect(ctx, GOLD[1], x, top + 8 + sag, 1, 1);
  }
}

function proscenium(ctx) {
  const { x0, x1, top } = STAGE, base = STAGE.lip - 2;
  for (const cx of [x0 - 12, x1]) {   // fluted gold columns
    for (let i = 0; i < 12; i++) rect(ctx, GOLD[[1, 2, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0][i]], cx + i, top - 10, 1, base - top + 10);
    rect(ctx, GOLD[4], cx - 1, top - 2, 14, 2); rect(ctx, GOLD[0], cx - 1, top, 14, 1);   // capital
    rect(ctx, GOLD[3], cx - 2, base - 6, 16, 2); rect(ctx, GOLD[1], cx - 2, base - 4, 16, 4);   // plinth
  }
  for (let i = 0; i < 6; i++) {   // the columns' inner faces, turning toward the back of the stage (depth)
    const yb = top + i, ye = base - 4 - Math.round(i * 2.4), c = i < 2 ? '#4a3510' : '#2e210a';
    rect(ctx, c, x0 + i, yb, 1, ye - yb); rect(ctx, c, x1 - 1 - i, yb, 1, ye - yb);
  }
  rect(ctx, '#3a2a0c', x0, top, x1 - x0, 2);   // the beam's underside
  rect(ctx, GOLD[1], x0 - 12, 13, x1 - x0 + 24, 11);   // the beam over the stage, with a running ornament
  rect(ctx, GOLD[4], x0 - 12, 13, x1 - x0 + 24, 1); rect(ctx, GOLD[0], x0 - 12, 23, x1 - x0 + 24, 1);
  for (let x = x0 - 8; x < x1 + 8; x += 6) { rect(ctx, GOLD[3], x, 16, 3, 3); rect(ctx, GOLD[0], x + 1, 17, 1, 1); rect(ctx, GOLD[2], x + 3, 20, 3, 1); }
  const cx = 160;   // the crest: a shield with a star
  rect(ctx, GOLD[0], cx - 9, 9, 18, 16); rect(ctx, GOLD[3], cx - 8, 10, 16, 13); rect(ctx, '#3a0a12', cx - 6, 12, 12, 9);
  for (const [a, b] of [[0, 0], [-1, 1], [0, 1], [1, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [-1, 3], [1, 3], [-2, 4], [2, 4]]) rect(ctx, GOLD[4], cx + a, 13 + b, 1, 1);
  rect(ctx, GOLD[2], cx - 5, 23, 10, 2); rect(ctx, GOLD[1], cx - 3, 25, 6, 1);
}

function props(ctx) {
  const pod = [150, 100];   // podium: dark wood, gold trim and plaque, a mic on a gooseneck
  for (let y = 0; y < 22; y++) { const inset = Math.round(y * 0.12); rect(ctx, y < 2 ? GOLD[3] : y % 7 === 0 ? '#3a1f0e' : '#5a3016', pod[0] + inset - 1, pod[1] + y, 22 - inset * 2 + 2, 1); }
  rect(ctx, GOLD[2], pod[0] + 6, pod[1] + 6, 10, 6); rect(ctx, GOLD[4], pod[0] + 6, pod[1] + 6, 10, 1);
  words(ctx, 'MFL', pod[0] + 6, pod[1] + 8, 1, '#3a1f0e');
  rect(ctx, '#222', pod[0] + 14, pod[1] - 6, 1, 6); rect(ctx, '#555', pod[0] + 12, pod[1] - 7, 3, 2);
  for (const tx of [96, 214]) {   // trophy stands with a gold cup on each
    rect(ctx, '#2a1530', tx - 6, 110, 14, 14); rect(ctx, '#5a3460', tx - 6, 110, 14, 1); rect(ctx, '#3a2040', tx - 6, 111, 2, 13); rect(ctx, '#160a1a', tx - 7, 123, 16, 2);
    rect(ctx, GOLD[0], tx - 2, 108, 6, 2); rect(ctx, GOLD[2], tx - 1, 106, 4, 2);   // base and stem
    for (let j = 0; j < 7; j++) { const half = j < 4 ? 4 : 4 - (j - 3); rect(ctx, GOLD[2], tx + 1 - half, 99 + j, half * 2, 1); }   // cup
    rect(ctx, GOLD[4], tx - 2, 100, 1, 4); rect(ctx, GOLD[0], tx + 3, 100, 1, 4); rect(ctx, GOLD[3], tx - 3, 99, 8, 1);
    rect(ctx, GOLD[1], tx - 5, 100, 1, 3); rect(ctx, GOLD[1], tx + 6, 100, 1, 3); rect(ctx, GOLD[1], tx - 4, 103, 1, 1); rect(ctx, GOLD[1], tx + 5, 103, 1, 1);   // handles
  }
}

// The whole still picture into a 320x180 canvas context. Returns the front-row heads (for clapping hands).
export function drawStage(ctx, season) {
  ctx.imageSmoothingEnabled = false;
  drawWalls(ctx); drawBalconies(ctx);
  backdrop(ctx); screenText(ctx, season); floor(ctx); props(ctx); curtains(ctx); proscenium(ctx);
  return drawAudience(ctx);
}
export { W, H };
