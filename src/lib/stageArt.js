// The ceremony stage as pixel art (a 320x180 world), drawn once: a gilded proscenium with fluted columns and a crest, a
// red velvet valance and tied-back curtains, the big screen (blank: stageScreen paints on it live), a wood floor in
// perspective with a red carpet up the middle, a lit glass trophy case and the walnut lectern. house: also the auditorium
// around it (stageHouse), for the full-screen show.
import { W, H, rect, drawWalls, drawBalconies, drawAudience } from './stageHouse.js';
import { drawTrophyCase, drawLectern } from './stageProps.js';

export const STAGE = { x0: 60, x1: 260, top: 24, floorBack: 98, floorFront: 128, lip: 132, vp: [160, 60] };
export const SCREEN = { x: 100, y: 31, w: 120, h: 52 };
export const MARKS = [128, 160, 192];   // where the three nominees stand
export const GOLD = ['#5a4116', '#8a6a2a', '#c79a3a', '#e9c368', '#fff0b0'];   // shadow ... shine

function floor(ctx) {
  const { x0, x1, floorBack: yb, lip, vp } = STAGE, fx0 = 34, fx1 = W - 34;
  for (let y = yb; y <= lip; y++) {
    const t = (y - yb) / (lip - yb), l = Math.round(x0 + 14 - (x0 + 14 - fx0) * t), r = Math.round(x1 - 14 + (fx1 - x1 + 14) * t);
    for (let x = l; x <= r; x++) {
      const mid = 1 - Math.abs(x - 160) / 140, warm = 0.3 + 0.7 * mid * (0.5 + 0.5 * t);
      ctx.fillStyle = `rgb(${Math.round(62 + 72 * warm)},${Math.round(33 + 38 * warm)},${Math.round(16 + 16 * warm)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.save(); ctx.beginPath(); ctx.moveTo(x0 + 14, yb); ctx.lineTo(x1 - 14, yb); ctx.lineTo(fx1, lip); ctx.lineTo(fx0, lip); ctx.closePath(); ctx.clip();
  ctx.strokeStyle = '#3a1f0e'; ctx.lineWidth = 1;   // planks run to the vanishing point
  for (let i = -10; i <= 10; i++) {
    const xf = 160 + i * 13, xb = vp[0] + (xf - vp[0]) * ((yb - vp[1]) / (lip - vp[1]));
    ctx.beginPath(); ctx.moveTo(Math.round(xb) + 0.5, yb); ctx.lineTo(Math.round(xf) + 0.5, lip); ctx.stroke();
  }
  for (const y of [104, 111, 119]) rect(ctx, '#4a2a14', 0, y, W, 1);
  for (let y = yb + 1; y < lip; y++) {   // the red carpet up the middle, gold-edged
    const t = (y - yb) / (lip - yb), half = Math.round(9 + 17 * t), d = 0.55 + 0.45 * t;
    ctx.fillStyle = `rgb(${Math.round(150 * d)},${Math.round(22 * d)},${Math.round(34 * d)})`; ctx.fillRect(160 - half, y, half * 2, 1);
    rect(ctx, GOLD[t > 0.5 ? 3 : 2], 160 - half - 1, y, 1, 1); rect(ctx, GOLD[t > 0.5 ? 3 : 2], 160 + half, y, 1, 1);
    if (y % 4 === 0) rect(ctx, '#00000022', 160 - half, y, half * 2, 1);
  }
  ctx.restore();
  rect(ctx, GOLD[3], fx0 - 4, lip, fx1 - fx0 + 8, 1); rect(ctx, GOLD[2], fx0 - 4, lip + 1, fx1 - fx0 + 8, 1);   // gilded lip
  rect(ctx, '#140608', fx0 - 4, lip + 2, fx1 - fx0 + 8, 5);
  for (let x = fx0; x <= fx1; x += 10) { rect(ctx, '#ffdd88', x, lip + 3, 3, 1); rect(ctx, '#6a4a1a', x, lip + 4, 3, 1); }   // footlights
}

function backdrop(ctx) {
  const { x0, x1, top, floorBack } = STAGE, g = ctx.createLinearGradient(0, top, 0, floorBack);
  g.addColorStop(0, '#0a0818'); g.addColorStop(1, '#1d1032');
  ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, floorBack - top);
  for (let x = x0; x < x1; x += 6) rect(ctx, '#160f2a', x, top, 1, floorBack - top);   // cyclorama pleats
  for (let i = 0; i < 60; i++) rect(ctx, i % 3 ? '#ffffff14' : '#e9c36830', x0 + ((i * 53) % (x1 - x0)), top + 8 + ((i * 29) % 60), 1, 1);   // a starcloth
  const { x, y, w, h } = SCREEN;   // the big screen's frame (stageScreen fills it)
  rect(ctx, '#050507', x - 4, y - 4, w + 8, h + 8); rect(ctx, GOLD[1], x - 3, y - 3, w + 6, 1); rect(ctx, GOLD[0], x - 3, y + h + 2, w + 6, 1);
  rect(ctx, '#24242c', x - 2, y - 2, w + 4, h + 4); rect(ctx, '#0c0a16', x, y, w, h);
  rect(ctx, '#2a2a34', x + w / 2 - 7, y + h + 4, 14, floorBack - (y + h + 4)); rect(ctx, '#3a3a46', x + w / 2 - 7, y + h + 4, 2, floorBack - (y + h + 4));
}

function curtains(ctx) {
  const { x0, x1, top, floorBack } = STAGE;
  const drape = (from, to, dir) => {
    for (let x = from; x !== to; x += dir) {
      const k = Math.abs(x - from), f = Math.sin(k * 1.1), c = f > 0.6 ? '#d23a44' : f > 0 ? '#a01d2a' : f > -0.6 ? '#7a1220' : '#520a14';
      const hem = floorBack + 2 + Math.round(k < 6 ? 0 : (k - 6) * 0.2), tie = 70 + Math.round(k * 0.6);
      const waist = Math.max(0, Math.round((22 - k) * 0.5));
      rect(ctx, c, x, top, 1, tie - top); rect(ctx, c, x + dir * Math.round(waist * 0.15), tie, 1, hem - tie);
    }
  };
  drape(x0, x0 + 26, 1); drape(x1 - 1, x1 - 27, -1);
  for (const [a, cx] of [[x0 + 2, x0 + 20], [x1 - 22, x1 - 4]]) {   // gold rope tie-backs with tassels
    for (let i = 0; i < 18; i++) rect(ctx, i % 2 ? GOLD[3] : GOLD[2], a + i, 76 + Math.round(Math.sin(i / 5.7 * Math.PI) * 1.5), 1, 2);
    rect(ctx, GOLD[3], cx - 1, 78, 3, 2); for (let j = 0; j < 5; j++) rect(ctx, GOLD[j % 2 ? 1 : 2], cx - 1 + (j % 3), 80 + j, 1, 1);
  }
  for (let x = x0; x < x1; x++) {   // the valance: scalloped swags with a gold fringe
    const u = ((x - x0) % 40) / 40, sag = Math.round(7 * Math.sin(u * Math.PI)), f = Math.sin((x - x0) * 0.7);
    rect(ctx, f > 0.3 ? '#b02634' : f > -0.3 ? '#8a1726' : '#5e0f19', x, top, 1, 6 + sag);
    rect(ctx, (x % 2) ? GOLD[3] : GOLD[2], x, top + 6 + sag, 1, 2);
    if (x % 3 === 0) rect(ctx, GOLD[1], x, top + 8 + sag, 1, 1);
  }
}

function proscenium(ctx) {
  const { x0, x1, top } = STAGE, base = STAGE.lip - 2;
  for (let i = 0; i < 6; i++) {   // the columns' inner faces turn toward the back of the stage (depth)
    const yb = top + i, ye = base - 4 - Math.round(i * 2.4), c = i < 2 ? '#4a3510' : '#2e210a';
    rect(ctx, c, x0 + i, yb, 1, ye - yb); rect(ctx, c, x1 - 1 - i, yb, 1, ye - yb);
  }
  for (const cx of [x0 - 12, x1]) {   // fluted gold columns
    for (let i = 0; i < 12; i++) rect(ctx, GOLD[[1, 2, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0][i]], cx + i, top - 10, 1, base - top + 10);
    rect(ctx, GOLD[4], cx - 1, top - 2, 14, 2); rect(ctx, GOLD[0], cx - 1, top, 14, 1);
    rect(ctx, GOLD[3], cx - 2, base - 6, 16, 2); rect(ctx, GOLD[1], cx - 2, base - 4, 16, 4);
  }
  rect(ctx, '#3a2a0c', x0, top, x1 - x0, 2);
  rect(ctx, GOLD[1], x0 - 12, 13, x1 - x0 + 24, 11);   // the beam over the stage, with a running ornament
  rect(ctx, GOLD[4], x0 - 12, 13, x1 - x0 + 24, 1); rect(ctx, GOLD[0], x0 - 12, 23, x1 - x0 + 24, 1);
  for (let x = x0 - 8; x < x1 + 8; x += 6) { rect(ctx, GOLD[3], x, 16, 3, 3); rect(ctx, GOLD[0], x + 1, 17, 1, 1); rect(ctx, GOLD[2], x + 3, 20, 3, 1); }
  const cx = 160;   // the crest: a shield with a star
  rect(ctx, GOLD[0], cx - 9, 9, 18, 16); rect(ctx, GOLD[3], cx - 8, 10, 16, 13); rect(ctx, '#3a0a12', cx - 6, 12, 12, 9);
  for (const [a, b] of [[0, 0], [-1, 1], [0, 1], [1, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [-1, 3], [1, 3], [-2, 4], [2, 4]]) rect(ctx, GOLD[4], cx + a, 13 + b, 1, 1);
  rect(ctx, GOLD[2], cx - 5, 23, 10, 2); rect(ctx, GOLD[1], cx - 3, 25, 6, 1);
}

// The whole still picture into a 320x180 context. house: the auditorium too. Returns the front-row heads (clapping hands).
export function drawStage(ctx, { house = true } = {}) {
  ctx.imageSmoothingEnabled = false;
  if (house) { drawWalls(ctx); drawBalconies(ctx); } else { ctx.fillStyle = '#0b0610'; ctx.fillRect(0, 0, W, H); }
  backdrop(ctx); floor(ctx); drawTrophyCase(ctx); drawLectern(ctx); curtains(ctx); proscenium(ctx);
  return house ? drawAudience(ctx) : [];
}
export { W, H };
