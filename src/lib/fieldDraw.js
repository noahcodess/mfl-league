// Paints the field. Every stadium's field is the same (same grass, lines, numbers, MFL logos on both 25s); only the midfield
// logo and the two end zones change with the home team (left: the team's location, right: its nickname; see endZoneDraw.js).
import { shade } from './pixels.js';
import { drawPixelText } from './pixelFont.js';
import { drawEndZone, endZoneWords } from './endZoneDraw.js';
import { YD, FX0, FY0, FX1, FY1, FW, FH, BORDER, MID_Y, HASH_TOP, HASH_BOTTOM, yardX, rng, brush } from './fieldLayout.js';

const G1 = '#3c8a3a', G2 = '#347d33', LINE = '#f2f5ee', POST = '#f2d23c';

function image(ctx, img, cx, cy, box, alpha = 1) {
  if (!img) return;
  const k = Math.min(box / img.width, box / img.height), w = Math.round(img.width * k), h = Math.round(img.height * k);
  ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  ctx.globalAlpha = 1;
}

function yardNumbers(r) {
  const put = (x, y, w, h) => r(x, y, w, h, LINE), s = 4;
  for (let yd = 10; yd <= 90; yd += 10) {
    const [a, b] = String(yd <= 50 ? yd : 100 - yd), x = yardX(yd);
    drawPixelText(put, a, x - 5 - 5 * s, FY1 - 12 * YD, s); drawPixelText(put, b, x + 5, FY1 - 12 * YD, s);       // near side, upright
    drawPixelText(put, b, x - 5 - 5 * s, FY0 + 12 * YD - 7 * s, s, 'flip'); drawPixelText(put, a, x + 5, FY0 + 12 * YD - 7 * s, s, 'flip'); // far side, facing the far stands
  }
}

function goalPost(r, x, side) {
  r(x + 4, MID_Y - 37 + 3, 4, 74, 'rgba(0,0,0,0.28)');                  // shadow on the grass
  r(x - (side < 0 ? 10 : -4), MID_Y - 3, 10, 6, shade(POST, 0.75));      // base post behind the end line
  r(x, MID_Y - 37, 4, 74, POST); r(x, MID_Y - 37, 1, 74, '#fff3a0');     // crossbar
  r(x - 2, MID_Y - 40, 8, 6, '#fff3a0'); r(x - 2, MID_Y + 34, 8, 6, '#fff3a0'); // the two uprights, seen from above
}

// team: { color, accent, name, location?, nickname? }. art: { teamLogo, leagueLogo } as loaded Images (either can be null).
// look: { font, design } for the end zones.
export function drawField(ctx, team, art = {}, look = {}) {
  const r = brush(ctx), rand = rng(77);
  r(FX0 - BORDER, FY0 - BORDER, FW + BORDER * 2, FH + BORDER * 2, LINE); // the white border
  r(FX0 - BORDER, FY1 + BORDER - 2, FW + BORDER * 2, 2, '#cfd4cc');
  for (let i = 0; i < 20; i++) r(yardX(i * 5), FY0, 5 * YD, FH, i % 2 ? G1 : G2); // 5-yard mowing stripes
  for (let i = 0; i < 20000; i++) r(yardX(0) + rand() * 100 * YD, FY0 + rand() * FH, rand() > 0.7 ? 2 : 1, 1, rand() > 0.5 ? '#44953f' : '#2f742f');
  const [place, nick] = endZoneWords(team);
  drawEndZone(ctx, team, FX0, place, 'up', look);
  drawEndZone(ctx, team, FX1 - 10 * YD, nick, 'down', look);

  for (let yd = 0; yd <= 100; yd++) {
    const x = yardX(yd);
    if (yd % 5 === 0) { r(x - 1, FY0, 2, FH, LINE); continue; }
    [FY0, HASH_TOP - 8, HASH_BOTTOM, FY1 - 8].forEach((y) => r(x - 1, y, 2, 8, LINE)); // sideline ticks and the two rows of hash marks
  }
  r(yardX(0) - 3, FY0, 6, FH, LINE); r(yardX(100) - 3, FY0, 6, FH, LINE); // goal lines
  r(FX0, FY0, FW, 3, LINE); r(FX0, FY1 - 3, FW, 3, LINE); r(FX0, FY0, 3, FH, LINE); r(FX1 - 3, FY0, 3, FH, LINE);
  yardNumbers(r);

  image(ctx, art.leagueLogo, yardX(25), MID_Y, 7 * YD); image(ctx, art.leagueLogo, yardX(75), MID_Y, 7 * YD);
  image(ctx, art.teamLogo, yardX(50), MID_Y, 13 * YD);

  [[yardX(0), FY0], [yardX(0), FY1], [FX0, FY0], [FX0, FY1], [yardX(100), FY0], [yardX(100), FY1], [FX1, FY0], [FX1, FY1]]
    .forEach(([x, y]) => { r(x - 3, y - 3, 6, 6, '#ff7a1a'); r(x - 3, y - 3, 3, 3, '#ffb066'); }); // pylons
  goalPost(r, FX0 - 1, -1); goalPost(r, FX1 - 2, 1);
}
