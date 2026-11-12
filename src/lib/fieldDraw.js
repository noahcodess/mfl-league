// Paints the field. Every stadium's field is the same (same grass, lines, numbers, MFL logos on both 25s); only the midfield
// logo and the two end zones change with the home team. Left end zone: the team's location. Right end zone: its nickname.
import { shade, brightness } from './pixels.js';
import { drawPixelText, textLength } from './pixelFont.js';
import { YD, FX0, FY0, FX1, FY1, FW, FH, BORDER, MID_Y, yardX, rng, brush } from './fieldLayout.js';

const G1 = '#3c8a3a', G2 = '#347d33', LINE = '#f2f5ee', POST = '#f2d23c';
const pick = (on, ...cs) => [...cs, '#f2f5ee', '#16171a'].find((c) => c && Math.abs(brightness(c) - brightness(on)) > 0.33);

function image(ctx, img, cx, cy, box, alpha = 1) {
  if (!img) return;
  const k = Math.min(box / img.width, box / img.height), w = Math.round(img.width * k), h = Math.round(img.height * k);
  ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  ctx.globalAlpha = 1;
}

function endZone(r, team, x0, word, dir) {
  const c = team.color, ink = pick(c, team.accent);
  r(x0, FY0, 10 * YD, FH, c);
  for (let d = -FH; d < 10 * YD; d += 12) for (let i = 0; i < FH; i += 2) { const x = x0 + d + i; if (x >= x0 && x < x0 + 10 * YD - 1) r(x, FY0 + i, 2, 2, shade(c, 0.9)); } // woven paint texture
  const text = word.toUpperCase();
  let s = 6; while (s > 2 && textLength(text, s) > FH - 44) s--;
  const L = textLength(text, s), thick = 7 * s, put = (col) => (x, y, w, h) => r(x, y, w, h, col);
  const edge = shade(c, 0.5);
  if (dir === 'up') { const x = x0 + (10 * YD - thick) / 2, y = FY0 + (FH + L) / 2; drawPixelText(put(edge), text, x + s / 2, y + s / 2, s, 'up'); drawPixelText(put(ink), text, x, y, s, 'up'); }
  else { const x = x0 + (10 * YD + thick) / 2, y = FY0 + (FH - L) / 2; drawPixelText(put(edge), text, x + s / 2, y + s / 2, s, 'down'); drawPixelText(put(ink), text, x, y, s, 'down'); }
}

function yardNumbers(r) {
  const put = (x, y, w, h) => r(x, y, w, h, LINE), s = 3;
  for (let yd = 10; yd <= 90; yd += 10) {
    const [a, b] = String(yd <= 50 ? yd : 100 - yd), x = yardX(yd);
    drawPixelText(put, a, x - 4 - 5 * s, FY1 - 11 * YD, s); drawPixelText(put, b, x + 4, FY1 - 11 * YD, s);       // near side, upright
    drawPixelText(put, b, x - 4 - 5 * s, FY0 + 11 * YD - 7 * s, s, 'flip'); drawPixelText(put, a, x + 4, FY0 + 11 * YD - 7 * s, s, 'flip'); // far side, facing the far stands
  }
}

function goalPost(r, x, side) {
  r(x + 3, MID_Y - 25 + 2, 3, 50, 'rgba(0,0,0,0.28)');                   // shadow on the grass
  r(x - (side < 0 ? 7 : -3), MID_Y - 2, 7, 4, shade(POST, 0.75));        // base post behind the end line
  r(x, MID_Y - 25, 3, 50, POST); r(x, MID_Y - 25, 1, 50, '#fff3a0');     // crossbar
  r(x - 1, MID_Y - 27, 5, 4, '#fff3a0'); r(x - 1, MID_Y + 23, 5, 4, '#fff3a0'); // the two uprights, seen from above
}

// team: { color, accent, name, location?, nickname? }. art: { teamLogo, leagueLogo } as loaded Images (either can be null).
export function drawField(ctx, team, art = {}) {
  const r = brush(ctx), rand = rng(77);
  r(FX0 - BORDER, FY0 - BORDER, FW + BORDER * 2, FH + BORDER * 2, LINE); // the white border
  r(FX0 - BORDER, FY1 + BORDER - 2, FW + BORDER * 2, 2, '#cfd4cc');
  for (let i = 0; i < 20; i++) r(yardX(i * 5), FY0, 5 * YD, FH, i % 2 ? G1 : G2); // 5-yard mowing stripes
  for (let i = 0; i < 9000; i++) r(yardX(0) + rand() * 100 * YD, FY0 + rand() * FH, rand() > 0.7 ? 2 : 1, 1, rand() > 0.5 ? '#44953f' : '#2f742f');
  const words = team.name.split(' ');
  endZone(r, team, FX0, team.location || words.slice(0, -1).join(' ') || team.name, 'up');
  endZone(r, team, FX1 - 10 * YD, team.nickname || words[words.length - 1], 'down');

  for (let yd = 0; yd <= 100; yd++) {
    const x = yardX(yd);
    if (yd % 5 === 0) { r(x - 1, FY0, 2, FH, LINE); continue; }
    [FY0, FY0 + 186, FY0 + 235, FY1 - 6].forEach((y) => r(x - 1, y, 2, 6, LINE)); // sideline ticks and the two rows of hash marks
  }
  r(yardX(0) - 2, FY0, 4, FH, LINE); r(yardX(100) - 2, FY0, 4, FH, LINE); // goal lines
  r(FX0, FY0, FW, 2, LINE); r(FX0, FY1 - 2, FW, 2, LINE); r(FX0, FY0, 2, FH, LINE); r(FX1 - 2, FY0, 2, FH, LINE);
  yardNumbers(r);

  image(ctx, art.leagueLogo, yardX(25), MID_Y, 8 * YD); image(ctx, art.leagueLogo, yardX(75), MID_Y, 8 * YD);
  image(ctx, art.teamLogo, yardX(50), MID_Y, 13 * YD);

  [[yardX(0), FY0], [yardX(0), FY1], [FX0, FY0], [FX0, FY1], [yardX(100), FY0], [yardX(100), FY1], [FX1, FY0], [FX1, FY1]]
    .forEach(([x, y]) => { r(x - 2, y - 2, 4, 4, '#ff7a1a'); r(x - 2, y - 2, 2, 2, '#ffb066'); }); // pylons
  goalPost(r, FX0 - 1, -1); goalPost(r, FX1 - 2, 1);
}
