// The one-of-a-kind stadium builds: the two domes (Rams and Guardians: a ribbed roof that closes over the top), the Dragons'
// castle (the stone arcade plus battlements, turrets and torches) and the Dolphins' futuristic curves (ribbon roofs that roll
// like waves). Each has a roof over the upper deck and supports that pass close to the camera.
import { shade } from './pixels.js';
import { W } from './stadiumLayout.js';
import { line, lamps, arcade } from './stadiumSupports.js';

const APEX = [W / 2, -150]; // where a dome's ribs would meet, far above the picture
const torch = (r, x, y) => { r(x, y + 5, 2, 6, '#3a2a1c'); r(x - 1, y + 2, 4, 3, '#ff8a1e'); r(x, y, 2, 3, '#ffd24a'); r(x - 3, y - 1, 8, 8, 'rgba(255,170,60,0.16)'); };

export const SPECIAL_ROOF = {
  dome(r, k, ctx) {
    ctx.globalAlpha = 0.68; r(0, 0, W, 46, k.steelLo); ctx.globalAlpha = 1; // roof panels: you can just make out what's outside
    for (let i = 1; i <= 3; i++) for (let x = 0; x < W; x++) { const y = 46 - i * 13 + ((x - W / 2) / (W / 2)) ** 2 * i * 8; r(x, y, 1, i === 3 ? 1 : 2, k.steel); } // hoops
    for (let x0 = 0; x0 <= W; x0 += 40) for (let t = 0; t <= 1; t += 0.01) r(x0 + (APEX[0] - x0) * t ** 1.5 * 0.34, 46 - 46 * t, 2, 2, k.steelHi); // ribs leaning in
    r(0, 46, W, 10, k.steel); r(0, 46, W, 2, k.steelHi); r(0, 54, W, 2, k.steelLo); r(0, 50, W, 1, k.paint);
    for (let x = 8; x < W; x += 16) r(x, 51, 2, 2, k.steelLo);
    for (let x = 20; x < W; x += 80) lamps(r, k, x, 58, 6);
    r(0, 0, W, 46, 'rgba(255,250,220,0.04)');
  },
  castle(r, k, ctx) {
    arcade(r, k, ctx);
    for (let x = 1; x < W; x += 12) { r(x, 34, 7, 6, k.steelHi); r(x, 34, 7, 1, '#ffffff55'); } // battlements
    for (let x = 60; x < W; x += 160) { // turrets with pointed roofs and a lit window
      r(x, 12, 24, 36, k.steel); r(x, 12, 2, 36, k.steelHi); r(x + 22, 12, 2, 36, k.steelLo); for (let y = 18; y < 46; y += 7) r(x, y, 24, 1, k.steelLo);
      for (let i = 0; i < 4; i++) r(x - 2 + i * 7, 8, 5, 5, k.steelHi);
      for (let i = 0; i < 6; i++) r(x + 2 + i * 2, 6 - i * 2 - 2, 20 - i * 4, 2, i % 2 ? k.paint : k.paintLo);
      r(x + 10, 22, 4, 9, '#1a1410'); r(x + 11, 24, 2, 6, '#ffcf7a');
    }
    for (let x = 7; x < W; x += 40) { r(x + 29, 54, 8, 24, k.paint); r(x + 29, 54, 8, 1, k.paintHi); r(x + 32, 60, 2, 10, k.trim); r(x + 29, 78, 3, 2, k.paint); r(x + 34, 78, 3, 2, k.paint); torch(r, x + 12, 60); }
  },
  wave(r, k) {
    const y1 = (x) => 36 + Math.round(7 * Math.sin(x / 30)), y2 = (x) => 15 + Math.round(5 * Math.sin(x / 30 + 2.2));
    for (let x = 0; x < W; x++) {
      r(x, y2(x) + 3, 1, y1(x) - y2(x) - 3, 'rgba(200,235,250,0.13)'); r(x, y2(x), 1, 3, k.steel); r(x, y2(x), 1, 1, '#ffffff');
      r(x, y1(x), 1, 9, k.steel); r(x, y1(x), 1, 2, '#ffffff'); r(x, y1(x) + 9, 1, 2, k.steelLo); r(x, y1(x) + 11, 1, 1, k.led);
      if (x % 20 === 10) r(x, y1(x) + 13, 2, 2, k.lamp);
    }
    for (let x0 = 47; x0 < W; x0 += 94) for (let t = 0; t <= 1; t += 0.02) { r(x0 + 26 * t * t, 62 - (62 - y1(x0 + 26) - 11) * t, 2, 2, k.steel); r(x0 - 26 * t * t, 62 - (62 - y1(x0 - 26) - 11) * t, 2, 2, k.steel); }
  },
};

export const SPECIAL_FRONT = {
  dome(r, k, h, beam) {
    const lo = shade(k.steel, 0.5), mid = shade(k.steel, 0.8), hi = shade(k.steel, 1.25);
    [0, 1].forEach((side) => { for (let y = 0; y < h; y++) { const x = 8 + Math.round(34 * (1 - y / h) ** 2), px = side ? W - x - 12 : x; r(px, y, 12, 1, mid); r(side ? px + 10 : px, y, 2, 1, hi); if (y % 20 === 0) r(px, y, 12, 2, lo); } });
    for (let x = 0; x < W; x++) { const y = beam - 26 + Math.round(40 * ((x - W / 2) / (W / 2)) ** 2); r(x, y, 1, 2, hi); r(x, y + 9, 1, 2, mid); if (x % 12 < 2) r(x, y + 2, 1, 7, lo); else if (x % 12 === 6) r(x, y + 2, 1, 7, mid); }
    for (let x = 90; x < W - 60; x += 100) { const y = beam - 15 + Math.round(40 * ((x - W / 2) / (W / 2)) ** 2); r(x, y, 1, 7, lo); r(x - 6, y + 7, 14, 4, lo); for (let i = 0; i < 3; i++) r(x - 5 + i * 4, y + 11, 3, 2, k.lamp); r(x - 8, y + 13, 18, 3, 'rgba(255,250,220,0.14)'); }
  },
  wave(r, k, h, beam) {
    const mid = shade(k.steel, 0.66), hi = shade(k.steel, 0.92), lo = shade(k.steel, 0.46);
    for (let y = 0; y < h; y++) { const x = 18 + Math.round(9 * Math.sin(y / 70)); r(x, y, 10, 1, mid); r(x, y, 2, 1, hi); r(x + 8, y, 2, 1, lo); r(x + 4, y, 1, 1, k.led); r(W - x - 10, y, 10, 1, mid); r(W - x - 2, y, 2, 1, hi); r(W - x - 10, y, 2, 1, lo); r(W - x - 5, y, 1, 1, k.led); }
    for (let x = 0; x < W; x++) { const y = beam + Math.round(9 * Math.sin(x / 46)); r(x, y, 1, 7, mid); r(x, y, 1, 2, hi); r(x, y + 5, 1, 2, lo); r(x, y + 3, 1, 1, k.led); r(x, y + 7, 1, 2, '#00000044'); }
  },
};
SPECIAL_FRONT.castleExtras = (r, h) => { for (let y = 40; y < h; y += 110) { torch(r, 12, y); torch(r, W - 14, y); } };
