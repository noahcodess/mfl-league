// Paints what's behind the stadium in the stadium shot: a banded pixel sky (day, night, or the biome's own sky), then the
// team's biome on top of it (stadiumBiomes.js). Day skies with nothing else in them get the MFL blimp; night skies get stars.
import { drawPixelText } from './pixelFont.js';
import { brush, rng } from './fieldLayout.js';
import { W, TRAVEL, layer } from './stadiumLayout.js';
import { BANDS, paintBiome } from './stadiumBiomes.js';

export function paintSky(look) {
  const c = layer(TRAVEL.far), ctx = c.getContext('2d'), r = brush(ctx), rand = rng(look.sky.length * 19 + 3), bands = BANDS[look.sky];
  bands.forEach((b, i) => {
    r(0, i * 22, W, i === 5 ? c.height : 22, b);
    if (i) for (let x = (i % 2) * 2; x < W; x += 4) r(x, i * 22 - 1, 2, 1, b); // dither into the band above
  });
  if (look.sky === 'night') {
    for (let i = 0; i < 90; i++) r(rand() * W, rand() * 110, 1, 1, rand() > 0.8 ? '#ffffff' : '#9fb0e0');
    r(388, 14, 12, 12, '#f3f0dc'); r(386, 17, 16, 6, '#f3f0dc'); r(391, 17, 3, 3, '#d9d5bd'); r(396, 21, 2, 2, '#d9d5bd');
  }
  paintBiome(ctx, look.scenery, look.sky === 'night');
  if (look.sky === 'day' && look.scenery === 'clear') { // the blimp
    r(200, 6, 40, 12, '#e9edf2'); r(196, 9, 4, 6, '#e9edf2'); r(240, 8, 5, 8, '#c8102e'); r(204, 16, 34, 2, '#b9c2cd'); r(214, 18, 12, 3, '#3a4150');
    drawPixelText((x, y, w, h) => r(x, y, w, h, '#12356b'), 'MFL', 211, 8);
  }
  return c;
}
