// The world around each stadium, as if the Minecraft biome were real. Each biome draws its sky, far layer, mid layer and ground,
// with parallax from the camera (cam). Built so far: Crimson Forest (Dragons) and Snowy Mountains (Creepers). More come with
// each new stadium.
import { SW, SH, rng, shade, drawSky } from './stadiumScene.js';

function crimsonSky(p, env, t) {
  p.bands(0, 0, SW, SH, '#140405', '#6b1712', 10); // no sky in the Nether: red fog
  const r = rng(5);
  for (let i = 0; i < 40; i++) { const x = (r() * SW + t * 6) % SW, y = (r() * SH + t * (4 + r() * 6)) % SH; p.px(x, SH - y, r() > 0.5 ? '#ff5a3c' : '#c62a1d'); } // drifting spores
}
function crimsonFar(p, t, cam) {
  const off = -cam * 0.15, r = rng(21);
  for (let i = -1; i < 8; i++) { // netherrack cliffs with lava falls
    const x = i * 60 + off % 60, h = 50 + r() * 50;
    p.poly([[x, SH], [x + 8, SH - h], [x + 30, SH - h - 12], [x + 52, SH - h + 6], [x + 64, SH]], '#3a0d0f');
    if (r() > 0.45) { const lx = x + 20 + r() * 20; p.rect(lx, SH - h, 3, h, '#ff8a1e'); p.rect(lx + 1, SH - h, 1, h, '#ffd166'); p.rect(lx - 2, SH - h, 7, h, 'rgba(255,120,30,0.18)'); }
  }
}
function fungus(p, x, base, h, w, glow) {
  const stem = '#5c1a24';
  p.rect(x - 3, base - h, 7, h, stem); p.rect(x - 3, base - h, 2, h, shade(stem, 1.3)); p.rect(x + 2, base - h, 2, h, shade(stem, 0.7));
  const cy = base - h - 4;
  p.rect(x - w, cy - 10, w * 2, 12, '#a3121b'); p.rect(x - w + 4, cy - 16, w * 2 - 8, 6, '#a3121b'); p.rect(x - w, cy - 10, w * 2, 2, '#c8202a');
  const r = rng(x * 7 + h);
  for (let i = 0; i < w / 2; i++) p.rect(x - w + r() * w * 2, cy - 14 + r() * 12, 2, 2, glow ? '#ffb347' : '#e8862a'); // shroomlights
  for (let i = 0; i < w / 3; i++) { const vx = x - w + r() * w * 2; p.rect(vx, cy + 2, 1, 4 + r() * 10, '#8c0f17'); } // weeping vines
}
function crimsonMid(p, t, cam) {
  const off = -cam * 0.45;
  [[20, 70, 22], [95, 95, 30], [190, 60, 20], [262, 88, 26], [345, 75, 24]].forEach(([x, h, w]) => fungus(p, ((x + off) % 380 + 380) % 380 - 30, SH - 30, h, w, true));
}
function crimsonGround(p, y, cam) {
  p.rect(0, y, SW, SH - y, '#4e1717');
  p.rect(0, y, SW, 4, '#8c1a1a');
  const r = rng(3);
  for (let i = 0; i < 160; i++) p.px((r() * SW - cam * 0.8 + 3200) % SW, y + r() * (SH - y), r() > 0.6 ? '#6b2020' : '#3d1212');
  for (let i = 0; i < 40; i++) p.px((r() * SW - cam * 0.8 + 3200) % SW, y - 1, '#b8222b'); // nylium tufts
}

function snowyFar(p, t, cam) {
  const ranges = [[0.1, 115, '#7f8fa6', 26], [0.22, 85, '#5f6d82', 41]];
  ranges.forEach(([k, top, rock, seed]) => {
    const r = rng(seed), off = -cam * k;
    for (let i = -1; i < 7; i++) {
      const x = i * 70 + ((off % 70) + 70) % 70 - 70, peak = top - r() * 55, w = 60 + r() * 50;
      p.poly([[x, SH - 20], [x + w / 2, SH - 20 - (SH - peak)], [x + w, SH - 20]], rock);
      p.poly([[x + w / 2 - 14, SH - 20 - (SH - peak) + 18], [x + w / 2, SH - 20 - (SH - peak)], [x + w / 2 + 14, SH - 20 - (SH - peak) + 18], [x + w / 2 + 4, SH - 20 - (SH - peak) + 14], [x + w / 2 - 6, SH - 20 - (SH - peak) + 20]], '#f4f8fc');
      p.poly([[x + w / 2, SH - 20 - (SH - peak)], [x + w, SH - 20], [x + w * 0.7, SH - 20]], shade(rock, 0.82)); // shadow side
    }
  });
}
function spruce(p, x, base, h) {
  p.rect(x - 1, base - 4, 3, 4, '#4a3426');
  for (let i = 0; i < 4; i++) { const w = 3 + (4 - i) * 3, y = base - 4 - i * (h / 4); p.poly([[x - w, y], [x + 1, y - h / 3], [x + w + 1, y]], '#1f3d2c'); p.rect(x - w + 2, y - 2, w, 1, '#eef4fa'); }
}
function snowyMid(p, t, cam) {
  const off = -cam * 0.5, r = rng(9);
  for (let i = 0; i < 22; i++) spruce(p, ((i * 19 + r() * 10 + off) % 420 + 420) % 420 - 50, SH - 26 + r() * 4, 18 + r() * 14);
}
function snowyGround(p, y, cam) {
  p.rect(0, y, SW, SH - y, '#e8eef6'); p.rect(0, y, SW, 2, '#ffffff');
  const r = rng(4);
  for (let i = 0; i < 90; i++) p.rect((r() * SW - cam * 0.8 + 3200) % SW, y + 3 + r() * (SH - y), 4, 1, '#c9d6e6');
}

export const BIOMES = {
  crimson: { sky: crimsonSky, far: crimsonFar, mid: crimsonMid, ground: crimsonGround, name: 'Crimson Forest', fog: 'rgba(120,20,15,0.25)' },
  snowy: { sky: (p, env, t, cam) => drawSky(p, env, t, cam), far: snowyFar, mid: snowyMid, ground: snowyGround, name: 'Snowy Mountains', fog: 'rgba(220,235,250,0.15)' },
};
