// The ceremony stage as pixel art, drawn once into a canvas twice the 320x180 world (so details sit on half-units): a
// gilded proscenium with fluted columns and a crest, a red velvet valance and tied-back curtains, the big screen hung over
// the stage (stageScreen paints on it live), a backdrop in the Craft Bowl's colors, a wood floor in perspective with a
// red carpet, the trophy pedestal and the lectern. house: also the auditorium around it (the full-screen show).
import { W, H, rect, drawWalls, drawBalconies, drawAudience } from './stageHouse.js';
import { drawPlinth, drawLectern } from './stageProps.js';

export const STAGE = { x0: 60, x1: 260, top: 24, floorBack: 98, floorFront: 128, lip: 132, vp: [160, 60] };
export const SCREEN = { x: 88, y: 33, w: 144, h: 58 };
export const MARKS = [136, 160, 184];   // where the three nominees stand
export const GOLD = ['#5a4116', '#8a6a2a', '#c79a3a', '#e9c368', '#fff0b0'];

function floor(ctx) {
  const { x0, x1, floorBack: yb, lip, vp } = STAGE, fx0 = 34, fx1 = W - 34;
  for (let y = yb; y <= lip; y += 0.5) {
    const t = (y - yb) / (lip - yb), l = Math.round((x0 + 14 - (x0 + 14 - fx0) * t) * 2) / 2, r = Math.round((x1 - 14 + (fx1 - x1 + 14) * t) * 2) / 2;
    for (let x = l; x <= r; x += 0.5) {
      const mid = 1 - Math.abs(x - 160) / 140, warm = 0.3 + 0.7 * mid * (0.5 + 0.5 * t), grain = Math.sin(x * 1.7 + Math.sin(y * 0.9) * 3) > 0.85 ? -10 : 0;
      ctx.fillStyle = `rgb(${Math.round(62 + 72 * warm + grain)},${Math.round(33 + 38 * warm + grain * 0.6)},${Math.round(16 + 16 * warm)})`;
      ctx.fillRect(x, y, 0.5, 0.5);
    }
  }
  ctx.save(); ctx.beginPath(); ctx.moveTo(x0 + 14, yb); ctx.lineTo(x1 - 14, yb); ctx.lineTo(fx1, lip); ctx.lineTo(fx0, lip); ctx.closePath(); ctx.clip();
  ctx.strokeStyle = '#3a1f0e'; ctx.lineWidth = 0.5;   // planks run to the vanishing point
  for (let i = -20; i <= 20; i++) {
    const xf = 160 + i * 6.5, xb = vp[0] + (xf - vp[0]) * ((yb - vp[1]) / (lip - vp[1]));
    ctx.beginPath(); ctx.moveTo(Math.round(xb * 2) / 2 + 0.25, yb); ctx.lineTo(Math.round(xf * 2) / 2 + 0.25, lip); ctx.stroke();
  }
  for (const y of [101, 104.5, 108, 112, 116.5, 121.5, 127]) rect(ctx, '#4a2a14', 0, y, W, 0.5);
  for (let y = yb + 0.5; y < lip; y += 0.5) {   // the red carpet up the middle, gold-edged
    const t = (y - yb) / (lip - yb), half = Math.round((9 + 17 * t) * 2) / 2, d = 0.55 + 0.45 * t;
    ctx.fillStyle = `rgb(${Math.round(150 * d)},${Math.round(22 * d)},${Math.round(34 * d)})`; ctx.fillRect(160 - half, y, half * 2, 0.5);
    rect(ctx, GOLD[t > 0.5 ? 3 : 2], 160 - half - 1, y, 1, 0.5); rect(ctx, GOLD[t > 0.5 ? 3 : 2], 160 + half, y, 1, 0.5);
    if ((y * 2) % 6 === 0) rect(ctx, '#00000022', 160 - half, y, half * 2, 0.5);
    if ((y * 2) % 4 === 0) rect(ctx, '#ffffff08', 160 - half * 0.4, y, half * 0.3, 0.5);   // pile sheen
  }
  ctx.restore();
  rect(ctx, GOLD[3], fx0 - 4, lip, fx1 - fx0 + 8, 1); rect(ctx, GOLD[4], fx0 - 4, lip, fx1 - fx0 + 8, 0.5); rect(ctx, GOLD[2], fx0 - 4, lip + 1, fx1 - fx0 + 8, 1);
  rect(ctx, '#140608', fx0 - 4, lip + 2, fx1 - fx0 + 8, 5);
  for (let x = fx0; x <= fx1; x += 10) { rect(ctx, '#ffdd88', x, lip + 3, 3, 1); rect(ctx, '#fff6d0', x + 0.5, lip + 3, 2, 0.5); rect(ctx, '#6a4a1a', x, lip + 4, 3, 1); }   // footlights
}

function backdrop(ctx, th) {
  const { x0, x1, top, floorBack } = STAGE, g = ctx.createLinearGradient(0, top, 0, floorBack);
  g.addColorStop(0, th.backdrop[0]); g.addColorStop(1, th.backdrop[1]);
  ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, floorBack - top);
  for (let x = x0; x < x1; x += 3) rect(ctx, th.pleat, x, top, 0.5, floorBack - top);   // cyclorama pleats
  for (let i = 0; i < 140; i++) rect(ctx, i % 4 ? '#ffffff1c' : th.star, x0 + ((i * 53.5) % (x1 - x0)), top + 6 + ((i * 29.5) % 64), 0.5, 0.5);   // starcloth
  const { x, y, w, h } = SCREEN;   // the screen hung on rigging (stageScreen fills it)
  for (const rx of [x + 12, x + w - 12]) rect(ctx, '#2a2a30', rx, top, 0.5, y - top);
  rect(ctx, '#050507', x - 3, y - 3, w + 6, h + 6); rect(ctx, '#1c1c22', x - 2, y - 2, w + 4, h + 4);
  rect(ctx, GOLD[2], x - 3, y - 3, w + 6, 0.5); rect(ctx, GOLD[0], x - 3, y + h + 2.5, w + 6, 0.5);
  rect(ctx, '#0c0a16', x, y, w, h);
  rect(ctx, '#00000055', x - 2, y + h + 3, w + 4, 2);   // its shadow on the backdrop
}

function curtains(ctx) {
  const { x0, x1, top, floorBack } = STAGE, SH = ['#e04a52', '#c22a35', '#a01d2a', '#7a1220', '#520a14'];
  const drape = (from, to, dir) => {
    for (let x = from; x !== to; x += dir * 0.5) {
      const k = Math.abs(x - from), f = Math.sin(k * 1.1), c = SH[f > 0.85 ? 0 : f > 0.4 ? 1 : f > -0.2 ? 2 : f > -0.7 ? 3 : 4];
      const hem = floorBack + 2 + (k < 6 ? 0 : (k - 6) * 0.2), tie = 70 + k * 0.6, waist = Math.max(0, (22 - k) * 0.5);
      rect(ctx, c, x, top, 0.5, tie - top); rect(ctx, c, x + dir * waist * 0.15, tie, 0.5, hem - tie);
    }
  };
  drape(x0, x0 + 26, 1); drape(x1 - 0.5, x1 - 26.5, -1);
  for (const [a, cx] of [[x0 + 2, x0 + 20], [x1 - 22, x1 - 4]]) {   // gold rope tie-backs with tassels
    for (let i = 0; i < 18; i += 0.5) rect(ctx, (i * 2) % 2 ? GOLD[3] : GOLD[2], a + i, 76 + Math.sin(i / 5.7 * Math.PI) * 1.5, 0.5, 1.5);
    rect(ctx, GOLD[3], cx - 1, 78, 3, 2); rect(ctx, GOLD[4], cx - 0.5, 78, 1, 0.5);
    for (let j = 0; j < 6; j += 0.5) rect(ctx, GOLD[(j * 2) % 2 ? 1 : 2], cx - 1 + ((j * 4) % 3), 80 + j, 0.5, 0.5);
  }
  for (let x = x0; x < x1; x += 0.5) {   // the valance: shallow scalloped swags with a gold fringe
    const u = ((x - x0) % 40) / 40, sag = 4 * Math.sin(u * Math.PI), f = Math.sin((x - x0) * 0.7);
    rect(ctx, f > 0.5 ? '#c0303c' : f > 0 ? '#a01d2a' : f > -0.5 ? '#8a1726' : '#5e0f19', x, top, 0.5, 4 + sag);
    rect(ctx, (x * 2) % 2 ? GOLD[3] : GOLD[2], x, top + 4 + sag, 0.5, 1);
    if ((x * 2) % 3 === 0) rect(ctx, GOLD[1], x, top + 5 + sag, 0.5, 1.5);
  }
}

function proscenium(ctx) {
  const { x0, x1, top } = STAGE, base = STAGE.lip - 2;
  for (let i = 0; i < 6; i += 0.5) {   // the columns' inner faces turn toward the back of the stage (depth)
    const yb = top + i, ye = base - 4 - i * 2.4, c = i < 2 ? '#4a3510' : '#2e210a';
    rect(ctx, c, x0 + i, yb, 0.5, ye - yb); rect(ctx, c, x1 - 0.5 - i, yb, 0.5, ye - yb);
  }
  const FL = [1, 2, 3, 4, 4, 3, 2, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 3, 2, 1, 2, 1, 0];   // flutes, half-unit strips
  for (const cx of [x0 - 12, x1]) {
    FL.forEach((v, i) => rect(ctx, GOLD[v], cx + i * 0.5, top - 10, 0.5, base - top + 10));
    rect(ctx, GOLD[4], cx - 1, top - 2, 14, 1); rect(ctx, GOLD[3], cx - 1, top - 1, 14, 1); rect(ctx, GOLD[0], cx - 1, top, 14, 0.5);
    rect(ctx, GOLD[3], cx - 2, base - 6, 16, 2); rect(ctx, GOLD[4], cx - 2, base - 6, 16, 0.5); rect(ctx, GOLD[1], cx - 2, base - 4, 16, 4);
  }
  rect(ctx, '#3a2a0c', x0, top, x1 - x0, 1.5);
  rect(ctx, GOLD[1], x0 - 12, 13, x1 - x0 + 24, 11);   // the beam with a running ornament
  rect(ctx, GOLD[4], x0 - 12, 13, x1 - x0 + 24, 0.5); rect(ctx, GOLD[3], x0 - 12, 13.5, x1 - x0 + 24, 0.5); rect(ctx, GOLD[0], x0 - 12, 23.5, x1 - x0 + 24, 0.5);
  for (let x = x0 - 8; x < x1 + 8; x += 6) { rect(ctx, GOLD[3], x, 16, 3, 3); rect(ctx, GOLD[4], x, 16, 1.5, 0.5); rect(ctx, GOLD[0], x + 1, 17, 1, 1); rect(ctx, GOLD[2], x + 3, 20, 3, 1); rect(ctx, GOLD[0], x + 3, 21, 3, 0.5); }
  const cx = 160;   // the crest: a shield with a star
  rect(ctx, GOLD[0], cx - 9, 9, 18, 16); rect(ctx, GOLD[3], cx - 8, 10, 16, 13); rect(ctx, GOLD[4], cx - 8, 10, 16, 0.5); rect(ctx, '#3a0a12', cx - 6, 12, 12, 9);
  for (const [a, b] of [[0, 0], [-1, 1], [0, 1], [1, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [-1, 3], [1, 3], [-2, 4], [2, 4]]) rect(ctx, GOLD[4], cx + a, 13 + b, 1, 1);
  rect(ctx, GOLD[2], cx - 5, 23, 10, 2); rect(ctx, GOLD[1], cx - 3, 25, 6, 1);
}

// The whole still picture into a 640x360 context. house: the auditorium too. theme: showTheme. Returns the front-row heads.
export function drawStage(ctx, { house = true, theme } = {}) {
  ctx.save(); ctx.scale(2, 2); ctx.imageSmoothingEnabled = false;
  if (house) { drawWalls(ctx); drawBalconies(ctx); } else { ctx.fillStyle = '#0b0610'; ctx.fillRect(0, 0, W, H); }
  backdrop(ctx, theme); floor(ctx); drawPlinth(ctx); drawLectern(ctx); curtains(ctx); proscenium(ctx);
  const heads = house ? drawAudience(ctx) : [];
  ctx.restore();
  return heads;
}
export { W, H };
