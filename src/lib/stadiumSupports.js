// Paints what holds each kind of stadium up: the roof over the upper deck (with its lights), the poles that stand in front of
// the upper-deck fans, and the supports that slide past close to the camera. The shared builds are here (modern, steel, cable,
// spruce) plus the stone arcade the castle is built on; the one-of-a-kind builds are in stadiumSpecials.js.
import { shade } from './pixels.js';
import { brush } from './fieldLayout.js';
import { W, TRAVEL, layer } from './stadiumLayout.js';
import { SPECIAL_ROOF, SPECIAL_FRONT } from './stadiumSpecials.js';

export const line = (r, x0, y0, x1, y1, c, t = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) r(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, t, t, c); };
export function lamps(r, look, x, y, n) {
  r(x - 1, y - 1, n * 4 + 1, 4, look.steelLo);
  for (let i = 0; i < n; i++) r(x + i * 4, y, 3, 2, look.lamp);
  r(x - 3, y + 3, n * 4 + 5, 2, 'rgba(255,250,220,0.16)');
}

// A stone arcade you can see out through, flags along the top (the castle adds to this).
export function arcade(r, k, ctx) {
  r(0, 46, W, 42, k.steel);
  for (let y = 50; y < 88; y += 7) { r(0, y, W, 1, k.steelLo); for (let x = ((y / 7) % 2) * 10; x < W; x += 20) r(x, y - 6, 1, 6, k.steelLo); }
  for (let x = 7; x < W; x += 40) {
    [[6, 14], [3, 20], [1, 24], [0, 26]].forEach(([inset, w], i) => ctx.clearRect(x + inset, 54 + i * 2, w, 2));
    ctx.clearRect(x, 62, 26, 22); r(x + 11, 50, 4, 5, k.paint); r(x + 12, 58, 2, 4, k.steelLo); r(x + 11, 62, 4, 4, k.lamp);
    r(x - 1, 84, 28, 2, k.steelHi);
  }
  r(0, 40, W, 6, k.steelHi); r(0, 45, W, 1, k.steelLo); for (let x = 2; x < W; x += 6) r(x, 46, 3, 2, k.steelHi);
  for (let x = 20; x < W; x += 80) { r(x, 20, 1, 20, '#d9dde2'); r(x + 1, 21, 11, 7, k.paint); r(x + 1, 24, 11, 1, k.trim); r(x + 9, 27, 3, 1, k.paintLo); }
}

const ROOF = {
  modern(r, k) { // a thin white roof under a floating halo ring, slim angled struts, one long light strip
    r(0, 24, W, 22, 'rgba(200,230,250,0.13)'); r(0, 20, W, 3, k.steel); r(0, 20, W, 1, '#ffffff'); r(0, 23, W, 1, k.led);
    for (let x = 40; x < W; x += 80) { line(r, x, 46, x + 10, 23, k.steel, 2); line(r, x, 62, x + 14, 54, k.steel, 2); line(r, x, 62, x - 14, 54, k.steel, 2); }
    r(0, 46, W, 5, k.steel); r(0, 46, W, 1, '#ffffff'); r(0, 51, W, 3, k.steelLo); r(0, 54, W, 1, k.led);
    for (let x = 4; x < W; x += 12) r(x, 56, 2, 1, k.lamp);
  },
  steel(r, k) { // a riveted truss roof with floodlight racks on top
    r(0, 28, W, 2, k.steel); r(0, 44, W, 3, k.steel);
    for (let x = 0; x < W; x += 16) { line(r, x, 30, x + 8, 44, k.steel); line(r, x + 8, 44, x + 16, 30, k.steel); r(x, 28, 1, 16, k.steelHi); }
    r(0, 47, W, 7, k.steelLo); r(0, 47, W, 2, k.paint); r(0, 54, W, 1, '#00000066');
    for (let x = 30; x < W; x += 120) { r(x + 13, 15, 2, 13, k.steel); r(x - 1, 4, 30, 11, k.steelLo); for (let i = 0; i < 2; i++) for (let j = 0; j < 7; j++) r(x + 1 + j * 4, 6 + i * 4, 3, 2, k.lamp); r(x - 4, 15, 36, 3, 'rgba(255,250,220,0.14)'); }
    for (let x = 84; x < W; x += 96) lamps(r, k, x, 56, 5);
  },
  cable(r, k) { // tall masts holding a white tent roof up with cables
    for (let x = 0; x < W; x += 2) { const d = Math.abs((((x + 80) % 160) + 160) % 160 - 80) / 80, top = 34 + Math.round((1 - d) * 11); r(x, top, 2, 54 - top, '#eef2f6'); r(x, top, 2, 1, '#ffffff'); r(x, 52, 2, 2, '#b9c4d1'); }
    for (let x = 80; x < W; x += 160) {
      [-72, -44, 44, 72].forEach((dx) => line(r, x, 2, x + dx, 40, k.steelHi));
      r(x - 2, 0, 4, 62, k.steel); r(x - 2, 0, 1, 62, '#ffffff'); r(x - 4, 10, 8, 2, k.paint); lamps(r, k, x - 8, 56, 4);
    }
  },
  spruce(r, k) { // a shingled timber roof on a log beam, lanterns hanging underneath
    for (let y = 30, i = 0; y < 46; y += 4, i++) { r(0, y, W, 4, i % 2 ? k.steelLo : shade(k.steel, 0.8)); for (let x = (i % 2) * 5; x < W; x += 10) r(x, y, 1, 4, '#2b1c10'); }
    r(0, 28, W, 2, k.steelHi); r(0, 46, W, 8, k.steel); r(0, 46, W, 1, k.steelHi); r(0, 50, W, 1, k.steelLo); for (let x = 30; x < W; x += 60) r(x, 46, 1, 8, k.steelLo);
    for (let x = 48; x < W; x += 60) { r(x, 54, 1, 4, '#2b1c10'); r(x - 2, 58, 5, 5, '#2b1c10'); r(x - 1, 59, 3, 3, k.lamp); r(x - 4, 63, 9, 2, 'rgba(255,207,122,0.18)'); }
  },
};

export function paintRoof(ctx, look) { (ROOF[look.kind] || SPECIAL_ROOF[look.kind])(brush(ctx), look, ctx); }

// Poles in front of the upper deck (only the builds that have them). Returns null when the view is clear.
export function paintPoles(look) {
  if (look.kind !== 'steel' && look.kind !== 'spruce') return null;
  const c = layer(TRAVEL.upper), r = brush(c.getContext('2d')), wood = look.kind === 'spruce', w = wood ? 5 : 4;
  for (let x = 46; x < W; x += 96) {
    r(x, 54, w, c.height, look.steel); r(x, 54, 1, c.height, look.steelHi); r(x + w - 1, 54, 1, c.height, look.steelLo);
    for (let y = 60; y < c.height; y += wood ? 18 : 12) r(x + 1, y, w - 2, 1, wood ? look.steelLo : look.steelHi);
    line(r, x, 68, x - 12, 54, look.steel, 2); line(r, x + w - 1, 68, x + w + 11, 54, look.steel, 2);
  }
  return c;
}

// The supports closest to the camera: dark shapes at the edges and one piece that crosses the picture as the camera rises.
export function paintFront(look) {
  const c = layer(TRAVEL.front), r = brush(c.getContext('2d')), h = c.height, lo = shade(look.steel, 0.42), mid = shade(look.steel, 0.62), hi = shade(look.steel, 0.9), beam = 300;
  if (look.kind === 'modern') {
    [20, W - 30].forEach((x) => { r(x, 0, 10, h, mid); r(x, 0, 2, h, hi); r(x + 8, 0, 2, h, lo); r(x + 4, 0, 1, h, look.led); for (let y = 40; y < h; y += 80) { r(x, y, 10, 1, lo); r(x - 2, y + 1, 14, 3, mid); r(x - 2, y + 1, 14, 1, hi); } });
    r(0, beam + 9, W, 3, '#00000055'); r(0, beam, W, 9, mid); r(0, beam, W, 2, hi); r(0, beam + 7, W, 2, lo); r(0, beam + 4, W, 1, look.led); for (let x = 30; x < W; x += 60) r(x, beam + 2, 1, 5, lo);
  } else if (look.kind === 'steel') {
    [18, W - 34].forEach((x) => { r(x, 0, 3, h, mid); r(x + 13, 0, 3, h, mid); r(x, 0, 1, h, hi); for (let y = 0; y < h; y += 24) { line(r, x + 2, y, x + 13, y + 24, lo, 2); line(r, x + 13, y, x + 2, y + 24, lo, 2); r(x, y, 16, 2, mid); } });
    r(0, beam, W, 3, mid); r(0, beam, W, 1, hi); r(0, beam + 3, W, 6, lo); r(0, beam + 9, W, 3, mid); for (let x = 6; x < W; x += 14) r(x, beam + 5, 2, 2, hi);
    r(0, beam + 3, W, 2, look.paintLo);
  } else if (SPECIAL_FRONT[look.kind]) {
    SPECIAL_FRONT[look.kind](r, look, h, beam);
  } else if (look.kind === 'castle') {
    [0, W - 28].forEach((x) => { r(x, 0, 28, h, mid); r(x ? x : 27, 0, 1, h, hi); for (let y = 0; y < h; y += 12) { r(x, y, 28, 1, lo); r(x + ((y / 12) % 2 ? 9 : 18), y, 1, 12, lo); } });
    for (let x = 28; x < W - 28; x++) { const y = beam - 30 + Math.round(64 * ((x - W / 2) / (W / 2 - 28)) ** 2); r(x, y, 1, 13, mid); r(x, y + 12, 1, 1, hi); r(x, y, 1, 2, lo); }
    r(W / 2 - 7, beam - 32, 14, 16, look.paintLo); r(W / 2 - 7, beam - 18, 14, 1, hi); SPECIAL_FRONT.castleExtras(r, h);
  } else if (look.kind === 'cable') {
    [12, W - 19].forEach((x, i) => {
      for (let y = -60; y < h; y += 150) { line(r, x + 3, y, x + 3 + (i ? -70 : 70), y + 210, lo); line(r, x + 3, y, x + 3 + (i ? -34 : 34), y + 210, lo); }
      r(x, 0, 7, h, mid); r(x, 0, 2, h, hi); for (let y = 30; y < h; y += 150) { r(x - 2, y, 11, 3, look.paintLo); r(x - 2, y, 11, 1, hi); }
    });
  } else {
    [14, W - 24].forEach((x) => { r(x, 0, 10, h, mid); r(x, 0, 2, h, hi); r(x + 8, 0, 2, h, lo); for (let y = 10; y < h; y += 26) r(x + 2, y, 6, 1, lo); });
    line(r, 24, beam + 60, 84, beam + 10, mid, 4); line(r, W - 24, beam + 60, W - 84, beam + 10, mid, 4);
    r(0, beam, W, 11, mid); r(0, beam, W, 2, hi); r(0, beam + 9, W, 2, lo); for (let x = 20; x < W; x += 44) r(x, beam + 2, 1, 7, lo);
    for (let x = 120; x < W - 60; x += 120) { r(x, beam + 11, 1, 6, lo); r(x - 3, beam + 17, 7, 8, lo); r(x - 2, beam + 18, 5, 6, look.lamp); r(x - 6, beam + 25, 13, 3, 'rgba(255,207,122,0.2)'); }
  }
  return c;
}
