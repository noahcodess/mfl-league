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

// The goal post, standing up off the field the classic 2D way: height goes up the screen and leans back away from the
// field a little, so you see the padded base, the gooseneck rising to the crossbar, the crossbar across the back of the end
// zone, and both uprights reaching up, with their shadow on the grass.
function goalPost(r, x, side) {
  const out = side < 0 ? -1 : 1, lean = 0.34, Y = MID_Y, bar = 30, up = 70, half = 37, INKC = '#2a2410';
  const line = (x0, y0, x1, y1, w, c) => { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))); for (let k = 0; k <= n; k++) r(x0 + ((x1 - x0) * k) / n - w / 2, y0 + ((y1 - y0) * k) / n - w / 2, w, w, c); };
  const up3 = (gx, gy, h) => [gx + out * h * lean, gy - h];                    // a point h pixels above the ground spot
  const dark = 'rgba(0,0,0,0.22)';
  line(x, Y, x + out * (bar + up) * 0.9, Y + 6, 3, dark);                        // shadows on the grass
  line(x + out * bar * 0.9, Y - half + 6, x + out * bar * 0.9, Y + half + 6, 3, dark);
  r(x - 4, Y - 4, 8, 8, '#2b2f36'); r(x - 3, Y - 3, 6, 6, '#3d434c');           // padded base
  const top = up3(x, Y, bar), base = up3(x, Y, 4);
  const beam = (a, b, w, c) => { line(a[0], a[1], b[0], b[1], w + 2, INKC); line(a[0], a[1], b[0], b[1], w, c); line(a[0] - 1, a[1], b[0] - 1, b[1], 1, '#fff3a0'); };   // outlined like the players
  beam(base, top, 5, '#d8b62c');                                                                   // the gooseneck
  const ends = [-half, half].map((dy) => [top[0], top[1] + dy]);
  ends.forEach((a) => beam(a, up3(a[0], a[1], up), 4, POST));                                       // uprights
  beam(ends[0], ends[1], 5, POST);                                                                 // crossbar
  ends.forEach((a) => { const b = up3(a[0], a[1], up); r(b[0] - 3, b[1] - 6, 6, 5, '#e2433b'); r(b[0] - 3, b[1] - 6, 6, 1, '#ff8a80'); });   // wind flags on top
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
