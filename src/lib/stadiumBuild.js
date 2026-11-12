// The stadium buildings. Futuristic (SoFi-style): a dark glass bowl with an LED ring in team colors under a huge floating
// translucent canopy, and an oval double-sided video board hanging inside. Historic: a tall stone bowl with arches, steel light
// towers, a modern glass suite ring and flags. Exterior views for the outside shots, and the inside of the bowl for the inside shots.
import { SW, shade, rng, lightsOn, drawCrowd } from './stadiumScene.js';

// Outside view. cx/base: where it stands; s: size (1 = fills about half the screen width).
export function drawExterior(p, st, team, env, cx, base, s, t) {
  const W = 150 * s, H = 46 * s;
  if (st.style === 'futuristic') {
    p.ellipse(cx, base - 6 * s, W * 0.55, 10 * s, 'rgba(0,0,0,0.35)');
    p.poly([[cx - W / 2, base], [cx - W / 2 + 8 * s, base - H * 0.55], [cx + W / 2 - 8 * s, base - H * 0.55], [cx + W / 2, base]], '#1b1f27'); // glass bowl
    for (let x = cx - W / 2 + 10 * s; x < cx + W / 2 - 10 * s; x += 6 * s) p.rect(x, base - H * 0.5, 1, H * 0.45, '#2c3442');
    p.rect(cx - W / 2 + 6 * s, base - H * 0.32, W - 12 * s, 2 * s, team.color); // LED ring
    p.rect(cx - W / 2 + 6 * s, base - H * 0.32, W - 12 * s, 1, shade(team.color, 1.5));
    for (let i = 0; i < 6; i++) { const x = cx - W * 0.42 + i * W * 0.168; p.rect(x, base - H * 0.95, 2 * s, H * 0.45, '#9aa3ad'); } // canopy supports
    p.poly([[cx - W * 0.62, base - H * 0.86], [cx - W * 0.3, base - H * 1.08], [cx + W * 0.3, base - H * 1.08], [cx + W * 0.62, base - H * 0.86], [cx + W * 0.5, base - H * 0.78], [cx - W * 0.5, base - H * 0.78]], 'rgba(235,240,245,0.92)');
    for (let i = 1; i < 12; i++) { const x = cx - W * 0.58 + i * W * 0.097; p.line(x, base - H * 0.84, x + 4 * s, base - H * 1.04, 'rgba(160,170,185,0.8)'); } // canopy panels
    p.rect(cx - W * 0.5, base - H * 0.79, W, 1, '#ffffff');
  } else {
    p.ellipse(cx, base - 4 * s, W * 0.55, 8 * s, 'rgba(0,0,0,0.3)');
    const stone = '#c2ad84', dark = shade(stone, 0.7);
    p.rect(cx - W / 2, base - H * 0.8, W, H * 0.8, stone); p.rect(cx - W / 2, base - H * 0.8, W, 3 * s, shade(stone, 1.15));
    if (st.biome === 'snowy') { p.rect(cx - W / 2 - 2, base - H * 0.8 - 2 * s, W + 4, 2 * s + 1, '#f4f8fc'); for (let x = cx - W / 2; x < cx + W / 2; x += 7 * s) p.rect(x, base - H * 0.8, 3 * s, s + 1, '#e3ebf4'); } // snow on the roofline
    for (let x = cx - W / 2 + 4 * s; x < cx + W / 2 - 6 * s; x += 9 * s) { p.rect(x, base - H * 0.42, 6 * s, H * 0.42, dark); p.rect(x, base - H * 0.48, 6 * s, 3 * s, shade(stone, 0.85)); if (st.biome === 'snowy') p.rect(x, base - H * 0.49, 6 * s, 1, '#f4f8fc'); } // arches
    p.rect(cx - W / 2, base - H * 0.68, W, 6 * s, '#2e4a5e'); p.rect(cx - W / 2, base - H * 0.68, W, 2, team.color); // glass suite ring
    for (let x = cx - W / 2; x < cx + W / 2; x += 5 * s) p.rect(x, base - H * 0.68, 1, 6 * s, '#5d7d94');
    [[-0.52, 1], [0.52, -1]].forEach(([k]) => { // light towers
      const x = cx + W * k; p.rect(x - 1, base - H * 1.45, 3 * s, H * 1.45, '#6f7884');
      for (let y = base - H * 1.45; y < base; y += 4 * s) p.line(x - 1, y, x + 2 * s, y + 4 * s, '#8a939e');
      p.rect(x - 6 * s, base - H * 1.55, 14 * s, 6 * s, '#3a3f47'); p.rect(x - 5 * s, base - H * 1.53, 12 * s, 3 * s, lightsOn(env) ? '#fff6c9' : '#d9dde3');
    });
    for (let i = 0; i < 5; i++) { const x = cx - W * 0.35 + i * W * 0.175; p.rect(x, base - H * 1.05, 1, H * 0.25, '#ddd'); p.rect(x + 1, base - H * 1.05 + Math.sin(t * 4 + i) , 7 * s * 0.6, 4 * s * 0.6, i % 2 ? team.color : team.accent); } // flags
  }
}

// Inside the bowl seen from high in the upper deck: stands with the crowd, and the roof (canopy + video board, or open sky + towers).
// Returns the box where the field goes { x0, x1, top, bottom } so the shot can draw it.
export function drawBowl(p, st, team, env, t, crowd) {
  const futur = st.style === 'futuristic';
  const seat = futur ? '#20242c' : '#4b4f57';
  p.poly([[0, 50], [SW, 50], [SW, 180], [0, 180]], seat);
  drawCrowd(p, 0, 52, SW, 66, crowd, t, 3);
  p.rect(0, 84, SW, 3, futur ? team.color : '#2e4a5e'); // suite ring / LED fascia
  p.rect(0, 85, SW, 1, futur ? shade(team.color, 1.5) : '#6f93ad');
  drawCrowd(p, 0, 88, SW, 34, crowd, t + 1, 9);
  p.poly([[0, 120], [SW, 120], [SW, 180], [0, 180]], shade(seat, 0.9));
  drawCrowd(p, 0, 122, 46, 58, crowd, t + 2, 13); drawCrowd(p, SW - 46, 122, 46, 58, crowd, t + 3, 17);
  if (futur) {
    p.rect(0, 0, SW, 50, 'rgba(235,240,245,0.9)'); // canopy underside
    for (let x = 0; x < SW; x += 16) p.line(x, 0, x + 10, 50, 'rgba(150,160,175,0.7)');
    p.rect(0, 46, SW, 4, '#9aa3ad');
    p.rect(105, 8, 110, 30, '#0d0f14'); p.rect(107, 10, 106, 26, '#14233a'); // the oval video board
    p.text(team.name.toUpperCase(), 160, 15, team.color === '#1f2024' ? '#ffffff' : shade(team.color, 1.4), 7, 'center');
    p.text(`${(st.capacity / 1000).toFixed(0)},000 STRONG`, 160, 25, '#f1f3f5', 6, 'center');
  } else {
    [[30, 1], [290, 1]].forEach(([x]) => { p.rect(x - 1, 0, 3, 50, '#6f7884'); p.rect(x - 12, 2, 26, 10, '#3a3f47'); const r = rng(x); for (let i = 0; i < 10; i++) p.rect(x - 11 + (i % 5) * 5, 3 + Math.floor(i / 5) * 4, 4, 3, lightsOn(env) || r() > 0.3 ? '#fff6c9' : '#d9dde3'); });
    p.rect(120, 14, 80, 24, '#1b1d22'); p.rect(122, 16, 76, 20, '#0c0d10'); // classic scoreboard
    p.text(st.name.toUpperCase(), 160, 19, '#ffcf5a', 7, 'center'); p.text('HOME  0 - 0  AWAY', 160, 28, '#f1f3f5', 5, 'center');
  }
  return { x0: 46, x1: SW - 46, top: 124, bottom: 180 };
}
