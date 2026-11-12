// The football field in pixels: a perspective field (far sideline narrower) with stripes, yard lines, painted end zones and the
// midfield logo, plus a straight-on end zone view with goalposts. Used by the stadium shots and later by the game itself.
import { shade } from './stadiumScene.js';

const GRASS = '#3f8f3a', GRASS2 = '#378233', LINE = '#f4f6f2';

// Field in a trapezoid: top edge from (fx0..fx1) at y0, bottom edge from (bx0..bx1) at y1. Long axis runs left to right.
export function drawFieldPerspective(p, team, box, logo) {
  const { y0, y1, fx0, fx1, bx0, bx1 } = box;
  const lerp = (a, b, k) => a + (b - a) * k;
  for (let y = y0; y <= y1; y++) {
    const k = (y - y0) / (y1 - y0), xl = lerp(fx0, bx0, k), xr = lerp(fx1, bx1, k), w = xr - xl;
    for (let i = 0; i < 12; i++) {
      const a = xl + (w * i) / 12, b = xl + (w * (i + 1)) / 12;
      const zone = i === 0 || i === 11;
      p.rect(a, y, b - a + 1, 1, zone ? (i === 0 ? team.color : shade(team.color, 0.85)) : i % 2 ? GRASS : GRASS2);
    }
    for (let i = 1; i <= 11; i++) p.px(xl + (w * i) / 12, y, LINE);
    p.px(xl, y, LINE); p.px(xr, y, LINE);
    if (k > 0.3 && k < 0.36) for (let i = 2; i <= 10; i++) p.px(xl + (w * (i - 0.5)) / 12, y, LINE); // hash marks
  }
  p.line(fx0, y0, fx1, y0, LINE); p.line(bx0, y1, bx1, y1, LINE);
  const midY = (y0 + y1) / 2, midW = lerp(fx1 - fx0, bx1 - bx0, 0.5);
  if (logo) { const s = Math.max(10, midW / 9); p.ctx.imageSmoothingEnabled = true; p.ctx.drawImage(logo, (lerp(fx0, bx0, 0.5) + lerp(fx1, bx1, 0.5)) / 2 - s / 2, midY - s * 0.32, s, s * 0.64); }
  const code = (team.code || team.id || '').toUpperCase();
  p.text(code, lerp(fx0, bx0, 0.5) + midW / 24, midY - 3, '#ffffff', Math.max(5, midW / 40), 'center');
  p.text(code, lerp(fx1, bx1, 0.5) - midW / 24, midY - 3, '#ffffff', Math.max(5, midW / 40), 'center');
}

// Looking straight down the field at an end zone: grass rows, the painted end zone with the team name, goalposts.
export function drawEndZone(p, team, t, y0 = 96) {
  for (let y = y0; y < 180; y++) {
    const k = (y - y0) / (180 - y0), half = 70 + k * 200;
    p.rect(160 - half, y, half * 2, 1, Math.floor((1 - k) * 14) % 2 ? GRASS : GRASS2);
  }
  for (let i = 1; i < 6; i++) { const y = y0 + 4 + i * i * 2.6, half = 70 + ((y - y0) / (180 - y0)) * 200; p.rect(160 - half, y, half * 2, 1, LINE); }
  p.rect(90, y0, 140, 12, team.color); p.rect(90, y0, 140, 1, LINE); p.rect(90, y0 + 11, 140, 1, LINE);
  p.text(team.name.split(' ').pop().toUpperCase(), 160, y0 + 2, team.color === '#f1f3f5' ? '#18191c' : '#ffffff', 8, 'center');
  const post = '#f2d23c';
  p.rect(159, y0 - 30, 2, 30, post); p.rect(146, y0 - 30, 28, 2, post); p.rect(146, y0 - 58, 2, 30, post); p.rect(172, y0 - 58, 2, 30, post);
  p.rect(146, y0 - 58 + Math.sin(t * 3) * 0, 1, 2, '#ff5a3c'); p.rect(173, y0 - 58, 1, 2, '#ff5a3c'); // wind ribbons
}
