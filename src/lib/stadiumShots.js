// The 7 cinematic shots that open a game at each stadium. Each draws one frame at time t (seconds) and progress k (0 to 1)
// so the camera can pan or push in. a = { st (stadium), team, env, crowd (colors), logo (Image or null) }.
import { SW, SH, rng, shade, drawCrowd } from './stadiumScene.js';
import { BIOMES } from './stadiumBiomes.js';
import { drawExterior, drawBowl } from './stadiumBuild.js';
import { drawFieldPerspective, drawEndZone } from './stadiumField.js';

function world(p, a, t, cam, groundY) {
  const b = BIOMES[a.st.biome];
  b.sky(p, a.env, t, cam); b.far(p, t, cam); b.mid(p, t, cam); b.ground(p, groundY, cam);
}
function fog(p, a) { const f = BIOMES[a.st.biome].fog; if (f) p.rect(0, 0, SW, SH, f); }
function flashes(p, t, x, y, w, h, n = 6) {
  const r = rng(Math.floor(t * 8));
  for (let i = 0; i < n; i++) if (r() > 0.5) { const fx = x + r() * w, fy = y + r() * h; p.rect(fx, fy, 2, 2, '#ffffff'); p.px(fx - 1, fy, '#fff6c9'); p.px(fx + 2, fy + 1, '#fff6c9'); }
}

export const SHOTS = [
  { key: 'arrival', label: 'Arrival', caption: (a) => `${a.st.name} · ${BIOMES[a.st.biome].name}`,
    draw(p, a, t, k) { world(p, a, t, k * 120, 150); drawExterior(p, a.st, a.team, a.env, 170 - k * 40, 152, 1.1, t); fog(p, a); } },
  { key: 'approach', label: 'Approach', caption: (a) => `Capacity ${a.st.capacity.toLocaleString('en-US')}`,
    draw(p, a, t, k) {
      world(p, a, t, 40 + k * 20, 160);
      const s = 2 + k * 0.35; drawExterior(p, a.st, a.team, a.env, 160, 175, s, t);
      p.rect(92, 175 - 46 * s * 0.48 - 12, 136, 12, '#0e1014'); p.rect(94, 175 - 46 * s * 0.48 - 10, 132, 8, shade(a.team.color, 0.6));
      p.text(a.st.name.toUpperCase(), 160, 175 - 46 * s * 0.48 - 9, '#ffffff', 7, 'center');
      const r = rng(2); for (let i = 0; i < 40; i++) { const x = (r() * SW + t * (10 + r() * 10)) % SW; p.rect(x, 170 + r() * 8, 2, 3, a.crowd[i % a.crowd.length]); }
      fog(p, a);
    } },
  { key: 'bowl', label: 'The bowl', caption: (a) => `${a.team.name} home field`,
    draw(p, a, t, k) {
      world(p, a, t, 60 + k * 30, 60);
      const box = drawBowl(p, a.st, a.team, a.env, t, a.crowd);
      drawFieldPerspective(p, a.team, { y0: box.top, y1: 180, fx0: 70 - k * 6, fx1: 250 + k * 6, bx0: 20 - k * 10, bx1: 300 + k * 10 }, a.logo);
      flashes(p, t, 0, 52, SW, 70, 8); fog(p, a);
    } },
  { key: 'crowd', label: 'The crowd', caption: (a) => (a.env.crowd === 'bloodbath' ? 'Bloodbath. The whole place in red.' : 'Sold out'),
    draw(p, a, t, k) {
      p.rect(0, 0, SW, SH, '#15171c');
      for (let row = 0; row < 9; row++) { const y = row * 20 - k * 12; p.rect(0, y + 16, SW, 4, shade('#2a2e36', 1 - row * 0.03)); drawCrowd(p, 0, y, SW, 16, a.crowd, t + row, 30 + row, 4); }
      const code = (a.team.code || a.team.id).toUpperCase(), r = rng(5);
      for (let i = 0; i < 5; i++) { const x = 20 + i * 62 + r() * 10, y = 40 + r() * 80 - k * 12 + Math.sin(t * 5 + i) * 2; p.rect(x, y, 28, 14, '#f4f4f0'); p.text(i % 2 ? code : 'GO!', x + 14, y + 3, a.team.color, 7, 'center'); }
      flashes(p, t, 0, 0, SW, SH, 10); fog(p, a);
    } },
  { key: 'endzone', label: 'End zone', caption: (a) => `Welcome to ${a.st.name}`,
    draw(p, a, t, k) {
      world(p, a, t, 30, 40);
      p.rect(0, 36, SW, 60, a.st.style === 'futuristic' ? '#20242c' : '#4b4f57');
      drawCrowd(p, 0, 38, SW, 56, a.crowd, t, 41, 3);
      p.rect(0, 92, SW, 4, a.team.color);
      if (a.st.style === 'futuristic') { p.rect(0, 0, SW, 34, 'rgba(235,240,245,0.92)'); p.rect(0, 32, SW, 4, '#9aa3ad'); }
      drawEndZone(p, a.team, t, 96 + (1 - k) * 4);
      flashes(p, t, 0, 38, SW, 56, 6); fog(p, a);
    } },
  { key: 'midfield', label: 'Midfield', caption: (a) => `${a.team.name}`,
    draw(p, a, t, k) {
      const zoom = 1 + k * 0.25;
      for (let i = 0; i < 12; i++) p.rect((i * 40 - 80) * zoom + 160 * (1 - zoom), 0, 40 * zoom + 1, SH, i % 2 ? '#3f8f3a' : '#378233');
      for (let i = 0; i < 13; i++) p.rect((i * 40 - 80) * zoom + 160 * (1 - zoom), 0, 2, SH, '#f4f6f2');
      if (a.logo) { const s = 100 * zoom; p.ctx.imageSmoothingEnabled = true; p.ctx.drawImage(a.logo, 160 - s / 2, 90 - s / 2, s, s); }
      p.text('50', 120 - k * 6, 150, '#f4f6f2', 12, 'center'); p.text('50', 200 + k * 6, 150, '#f4f6f2', 12, 'center');
      fog(p, a);
    } },
  { key: 'tunnel', label: 'Walkout', caption: (a) => `Here come the ${a.team.name.split(' ').pop()}!`,
    draw(p, a, t, k) {
      world(p, a, t, 50, 60);
      drawBowl(p, a.st, a.team, a.env, t, a.crowd);
      drawFieldPerspective(p, a.team, { y0: 124, y1: 180, fx0: 60, fx1: 260, bx0: 10, bx1: 310 }, a.logo);
      const open = 70 + k * 40; // push in through the tunnel
      p.rect(0, 0, 160 - open, SH, '#07080a'); p.rect(160 + open, 0, SW, SH, '#07080a'); p.rect(0, 0, SW, 40 - k * 30, '#07080a');
      p.rect(160 - open - 4, 0, 4, SH, a.team.color); p.rect(160 + open, 0, 4, SH, a.team.color);
      const r = rng(3); for (let i = 0; i < 24; i++) { const sx = 160 - open + r() * open * 2, sy = 120 + r() * 60 - ((t * 20 + i * 7) % 60); p.rect(sx, sy, 6 + r() * 6, 4, 'rgba(230,230,235,0.35)'); } // smoke
      flashes(p, t, 160 - open, 50, open * 2, 70, 5);
    } },
];
