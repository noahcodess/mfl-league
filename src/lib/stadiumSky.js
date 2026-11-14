// Paints what's behind the stadium in the stadium shot: a banded pixel sky for day games (clouds and the MFL blimp), night
// games (stars and a moon), or the inside of a dome (roof trusses and hanging lights).
import { drawPixelText } from './pixelFont.js';
import { brush, rng } from './fieldLayout.js';
import { W, TRAVEL, layer } from './stadiumLayout.js';

const BANDS = {
  day: ['#3f8fd8', '#4f9cdf', '#62aae6', '#78b8ec', '#90c6f0', '#a8d4f4'], night: ['#060818', '#090d24', '#0d1330', '#121a3e', '#18224c', '#1f2b5a'],
  dome: ['#12141a', '#161920', '#1b1f27', '#20252e', '#262b36', '#2c323e'],
};

export function paintSky(look) {
  const c = layer(TRAVEL.far), r = brush(c.getContext('2d')), rand = rng(look.sky.length * 19 + 3), bands = BANDS[look.sky];
  bands.forEach((b, i) => {
    r(0, i * 22, W, i === 5 ? c.height : 22, b);
    if (i) for (let x = (i % 2) * 2; x < W; x += 4) r(x, i * 22 - 1, 2, 1, b); // dither into the band above
  });
  if (look.sky === 'day') {
    [[40, 24, 46], [170, 52, 34], [300, 16, 58], [410, 60, 40]].forEach(([x, y, w]) => {
      r(x, y, w, 6, '#f4f9fd'); r(x + 6, y - 4, w - 18, 4, '#f4f9fd'); r(x + 14, y - 7, w - 34, 3, '#ffffff'); r(x + 3, y + 6, w - 8, 2, '#d5e6f3');
    });
    r(226, 30, 40, 12, '#e9edf2'); r(222, 33, 4, 6, '#e9edf2'); r(266, 32, 5, 8, '#c8102e'); r(230, 40, 34, 2, '#b9c2cd'); r(240, 42, 12, 3, '#3a4150'); // the blimp
    drawPixelText((x, y, w, h) => r(x, y, w, h, '#12356b'), 'MFL', 237, 32);
  } else if (look.sky === 'night') {
    for (let i = 0; i < 90; i++) r(rand() * W, rand() * 110, 1, 1, rand() > 0.8 ? '#ffffff' : '#9fb0e0');
    r(388, 14, 12, 12, '#f3f0dc'); r(386, 17, 16, 6, '#f3f0dc'); r(391, 17, 3, 3, '#d9d5bd'); r(396, 21, 2, 2, '#d9d5bd');
  } else {
    for (let x = -40; x < W; x += 48) { for (let i = 0; i < 120; i++) { r(x + i * 0.4, i, 1, 1, '#3a4150'); r(x + 48 - i * 0.4, i, 1, 1, '#3a4150'); } }
    for (let y = 18; y < 120; y += 30) { r(0, y, W, 2, '#3a4150'); r(0, y + 2, W, 1, '#1a1d24'); }
    for (let x = 30; x < W; x += 84) { r(x + 9, 20, 1, 12, '#555c6b'); r(x, 32, 20, 5, '#2a2f3a'); for (let i = 0; i < 4; i++) r(x + 1 + i * 5, 37, 3, 2, look.lamp); r(x - 2, 39, 24, 3, 'rgba(255,250,220,0.14)'); }
  }
  return c;
}
