// What you can see behind each team's stadium: its biome. Some are plain clear sky; some are always dark (the Deep Dark, the
// Dark Forest, the Void, the Nether, the End). Only the tops show over the roof, so everything is drawn big and simple.
import { brush, rng } from './fieldLayout.js';
import { W } from './stadiumLayout.js';

// team -> [scenery, sky bands when it has its own sky (always the same, day or night)]
export const BIOME = {
  snm: ['mountains'], pln: ['clear'], flf: ['clear'], tga: ['clear'], ocn: ['clear'], dst: ['hot'], wsl: ['dry'], ocm: ['temples'],
  ddc: ['deep', 'deep'], drf: ['forest', 'forest'], void: ['void', 'void'], crf: ['crimson', 'nether'], ntw: ['nether', 'nether'],
  wrf: ['warped', 'warped'], edc: ['end', 'end'], lsc: ['cave', 'cave'],
};
export const BANDS = {
  day: ['#3f8fd8', '#4f9cdf', '#62aae6', '#78b8ec', '#90c6f0', '#a8d4f4'], night: ['#060818', '#090d24', '#0d1330', '#121a3e', '#18224c', '#1f2b5a'],
  hot: ['#4a9be0', '#6fb2e8', '#9bcbee', '#c9e0ea', '#efe6c4', '#f7dc9a'], dry: ['#b89a4a', '#c8a853', '#d6b660', '#e0c36f', '#e8cf82', '#eed998'],
  deep: ['#020608', '#04090c', '#060d11', '#081217', '#0a171d', '#0c1c23'], forest: ['#05080d', '#070c12', '#0a1118', '#0d171e', '#111d24', '#15242b'],
  void: ['#000000', '#030108', '#06030f', '#090516', '#0c071d', '#100924'], nether: ['#1c0505', '#2a0808', '#380b0a', '#46100c', '#55150e', '#641b10'],
  warped: ['#06100f', '#0a1917', '#0e221f', '#122b27', '#16342f', '#1a3d37'], end: ['#07040d', '#0c0716', '#120a20', '#180e2a', '#1e1234', '#25173f'],
  cave: ['#060a08', '#0a100c', '#0e1610', '#121c14', '#162218', '#1a281c'],
};

const ridge = (r, base, amp, s, color, cap) => { for (let x = 0; x < W; x += 2) { const y = Math.round(base - amp * (0.62 * Math.abs(Math.sin(x * 0.019 + s)) + 0.38 * Math.abs(Math.sin(x * 0.053 + s * 2.3)))); r(x, y, 2, 400, color); if (cap) r(x, y, 2, Math.max(2, Math.round((base - y) * 0.3)), cap); } };
// Pointed mountains: sharp peaks every `span` pixels, snow on the top third with a ragged edge.
const peaks = (r, base, amp, span, shift, color, snow) => { for (let x = 0; x < W; x += 2) { const u = ((x + shift) % span) / span, v = ((x + shift * 3) % (span * 0.37)) / (span * 0.37);
  const y = Math.round(base - amp * (0.8 * (1 - Math.abs(u * 2 - 1)) + 0.2 * (1 - Math.abs(v * 2 - 1)))); r(x, y, 2, 400, color); const cap = Math.round((base - y) * 0.34) - ((x >> 1) % 3) * 2; if (cap > 0) r(x, y, 2, cap, snow); } };
const drips = (r, rand, color, max) => { for (let x = 0; x < W; x += 4 + Math.floor(rand() * 8)) { const w = 3 + Math.floor(rand() * 7), h = 3 + Math.floor(rand() * max); r(x, 0, w, h, color); r(x + 1, h, Math.max(1, w - 2), 3, color); } };
const fungus = (r, x, top, stem, cap, glow) => { r(x + 5, top + 8, 4, 400, stem); r(x - 4, top + 3, 22, 7, cap); r(x, top, 14, 4, cap); r(x - 2, top + 10, 4, 3, cap); r(x + 14, top + 10, 4, 4, cap); r(x + 2, top + 2, 2, 2, glow); r(x + 11, top + 5, 2, 2, glow); };

const PAINT = {
  clear() {},
  mountains(r) { peaks(r, 70, 66, 150, 20, '#93a9c6', '#eef4fb'); peaks(r, 82, 58, 104, 70, '#647d9b', '#ffffff'); peaks(r, 96, 36, 62, 11, '#44587a', '#e3ecf7'); },
  hot(r) { r(372, 10, 22, 22, '#fff6c8'); r(368, 14, 30, 14, '#fff6c8'); r(364, 6, 38, 30, 'rgba(255,240,170,0.28)'); for (let y = 58; y < 120; y += 5) r(0, y, W, 2, 'rgba(255,236,170,0.22)'); },
  dry(r, rand) { for (let i = 0; i < 26; i++) r(rand() * W, 6 + rand() * 90, 30 + rand() * 60, 2, 'rgba(120,96,40,0.2)'); r(96, 16, 16, 16, 'rgba(255,244,200,0.55)'); },
  temples(r) { // ocean monuments: stepped prismarine temples with sea lanterns
    [[60, 30, 92], [250, 18, 120], [404, 36, 76]].forEach(([x, top, w]) => {
      for (let i = 0; i < 6; i++) { const sw = w * (0.28 + i * 0.144); r(x + (w - sw) / 2, top + i * 9, sw, 9, i % 2 ? '#3d857b' : '#4f9d92'); r(x + (w - sw) / 2, top + i * 9, sw, 1, '#7cc9bc'); }
      r(x, top + 54, w, 400, '#2f6b63'); for (let px = x + 6; px < x + w - 4; px += 14) { r(px, top + 58, 5, 400, '#24544e'); r(px + 1, top + 50, 3, 3, '#e9fffb'); }
      r(x + w / 2 - 3, top - 5, 6, 5, '#e9fffb');
    });
  },
  deep(r, rand) { // the Deep Dark: a cave roof, city pillars, sculk glowing in the black
    drips(r, rand, '#0b1a1f', 26); ridge(r, 96, 30, 1.2, '#081419');
    for (let x = 30; x < W; x += 88) { r(x, 14, 14, 400, '#101f25'); r(x, 14, 2, 400, '#1a3038'); r(x - 4, 30, 22, 5, '#101f25'); r(x + 5, 40, 4, 5, '#3fe0e8'); r(x + 3, 46, 8, 2, 'rgba(63,224,232,0.3)'); }
    for (let i = 0; i < 70; i++) r(rand() * W, rand() * 110, 2, 1, rand() > 0.6 ? '#1fb7c4' : '#0e5964');
  },
  forest(r, rand) { // the Dark Forest: huge dark oaks and a couple of giant mushrooms
    for (let x = -10; x < W; x += 34 + Math.floor(rand() * 22)) { const top = Math.floor(rand() * 14), w = 44 + Math.floor(rand() * 20); r(x + w / 2 - 4, top + 14, 9, 400, '#241910'); r(x, top + 8, w, 22, '#123620'); r(x + 6, top, w - 12, 12, '#184428'); r(x - 5, top + 18, w + 10, 12, '#0d2817'); r(x + 8, top + 3, 8, 2, '#2a6a40'); r(x + w - 20, top + 10, 6, 2, '#2a6a40'); }
    fungus(r, 150, 6, '#cfc8b4', '#a32020', '#f1ece0'); fungus(r, 372, 10, '#cfc8b4', '#7a5630', '#a07c52');
  },
  void(r, rand) { for (let i = 0; i < 80; i++) r(rand() * W, rand() * 130, 1, 1, rand() > 0.7 ? '#7a4fd6' : '#2c1a55'); for (let i = 0; i < 7; i++) r(rand() * W, 10 + rand() * 80, 40 + rand() * 80, 1, 'rgba(90,50,170,0.18)'); },
  nether(r, rand) { // netherrack roof, glowstone, lava falls, a fortress bridge
    drips(r, rand, '#4a1210', 22); for (let i = 0; i < 9; i++) { const x = rand() * W; r(x, 6 + rand() * 12, 6, 4, '#ffd76a'); r(x + 1, 10 + rand() * 6, 3, 3, '#fff3b0'); }
    [70, 214, 398].forEach((x) => { r(x, 0, 4, 400, '#ff8a1e'); r(x + 1, 0, 2, 400, '#ffd24a'); r(x - 3, 0, 10, 400, 'rgba(255,120,20,0.14)'); });
    r(0, 52, W, 7, '#1d0d10'); r(0, 52, W, 1, '#3a1a20'); for (let x = 14; x < W; x += 52) { r(x, 59, 10, 400, '#1d0d10'); r(x - 2, 46, 3, 6, '#1d0d10'); r(x + 9, 46, 3, 6, '#1d0d10'); }
    ridge(r, 110, 20, 0.7, '#3a0e0c');
  },
  crimson(r, rand) { PAINT.nether(r, rand); [24, 118, 176, 300, 352, 440].forEach((x, i) => fungus(r, x, 20 + (i % 3) * 9, '#4a1626', '#a3162a', '#ff6a3d')); },
  warped(r, rand) { drips(r, rand, '#0d2622', 20); ridge(r, 104, 22, 1.9, '#0c2420'); [16, 92, 168, 262, 330, 420].forEach((x, i) => fungus(r, x, 16 + (i % 3) * 11, '#3a1f4a', '#14a6a0', '#7df2e2')); for (let i = 0; i < 40; i++) r(rand() * W, rand() * 100, 1, 1, '#2fd8c8'); },
  end(r, rand) { // the End: a static sky and End city towers in end stone and purpur
    for (let i = 0; i < 260; i++) r(rand() * W, rand() * 130, 2, 1, rand() > 0.5 ? '#2c1a48' : '#150c26');
    [[40, 26], [128, 8], [212, 34], [300, 14], [392, 28], [452, 12]].forEach(([x, top], i) => {
      r(x + 4, top + 12, 8, 400, '#d9d8a0'); r(x + 4, top + 12, 2, 400, '#eeedb8'); r(x, top, 16, 12, '#b98fba'); r(x, top, 16, 2, '#d5b0d6'); r(x - 2, top + 4, 20, 3, '#8f6a91');
      r(x + 6, top + 4, 4, 4, '#f3e37a'); if (i % 2) { r(x + 16, top + 22, 14, 3, '#d9d8a0'); r(x + 26, top + 16, 8, 9, '#b98fba'); } r(x + 7, top - 7, 1, 7, '#d9d8a0'); r(x + 8, top - 7, 5, 3, '#c94f9a');
    });
  },
  cave(r, rand) { drips(r, rand, '#1b2a20', 24); for (let x = 8; x < W; x += 16 + Math.floor(rand() * 20)) { const n = 10 + Math.floor(rand() * 40); r(x, 0, 1, n, '#2f7a3a'); for (let y = 6; y < n; y += 9) r(x - 1, y, 3, 2, '#ffb43a'); } ridge(r, 100, 18, 3.3, '#1f4a2a', '#3f8f48'); },
};

export function paintBiome(ctx, scenery, night) {
  PAINT[scenery](brush(ctx), rng(scenery.length * 53 + 11));
  if (night && BIOME_DAYLIT.has(scenery)) { ctx.fillStyle = 'rgba(6,8,26,0.6)'; ctx.fillRect(0, 0, W, ctx.canvas.height); }
}
const BIOME_DAYLIT = new Set(['mountains', 'temples']);
