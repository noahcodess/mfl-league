// Pixel hairstyles for player portraits: each style paints onto the 32x32 grid over the head.
import { shade, mix } from './pixels.js';

// Hair cap from row `top` down to the hairline (row 8): narrow at the top, full width lower down.
function fill(g, top, paint) {
  for (let y = top; y <= 8; y++) {
    const [a, b] = y === top ? [11, 20] : y === top + 1 ? [9, 22] : [8, 23];
    for (let x = a; x <= b; x++) {
      const c = paint(x, y);
      g.set(x, y, c && y === 8 ? shade(c, 0.8) : c);
    }
  }
}

export function drawHair(g, L, head) {
  const h = L.hair, hi = shade(h, 1.45), sh = shade(h, 0.68);
  const soft = mix(L.skin, h, 0.6);
  const lit = (x, y) => ((x * 5 + y * 3) % 11 === 0 ? hi : x >= 21 ? sh : h);
  switch (L.style) {
    case 'bald':
      g.set(12, 7, shade(L.skin, 1.35)); g.set(13, 7, shade(L.skin, 1.25)); g.set(12, 8, shade(L.skin, 1.2));
      return;
    case 'buzz':
      fill(g, 5, (x, y) => (y === 8 && x % 2 ? null : soft));
      return;
    case 'short':
      fill(g, 4, lit);
      g.row(5, 12, 15, hi);
      g.rect(8, 9, 1, 3, h); g.rect(23, 9, 1, 3, sh);
      return;
    case 'side':
      fill(g, 4, lit);
      g.rect(12, 4, 1, 3, sh);
      g.row(9, 9, 12, h); g.row(10, 9, 10, h); g.row(5, 13, 17, hi);
      g.rect(23, 9, 1, 2, sh);
      return;
    case 'fade':
      fill(g, 3, (x, y) => (y >= 6 && (x < 10 || x > 21) ? ((x + y) % 2 ? soft : null) : lit(x, y)));
      for (let y = 9; y <= 11; y++) { if (y % 2) { g.set(8, y, soft); g.set(23, y, soft); } }
      return;
    case 'messy':
      [11, 14, 17, 20].forEach((x) => g.set(x, 2, h));
      fill(g, 3, (x, y) => (y === 3 && (x === 13 || x === 18) ? null : lit(x, y)));
      g.row(9, 9, 11, h); g.set(15, 9, h); g.row(9, 19, 21, sh); g.set(10, 10, h); g.set(20, 10, sh);
      g.set(12, 4, hi); g.set(16, 3, hi); g.set(13, 5, hi); g.set(18, 5, hi);
      g.rect(8, 9, 1, 3, h); g.rect(23, 9, 1, 3, sh);
      return;
    case 'curly':
      fill(g, 2, (x, y) => (y === 2 && x % 2 ? null : (x * 3 + y * 5) % 4 === 0 ? hi : (x + y * 2) % 5 === 0 ? sh : h));
      g.rect(8, 9, 1, 2, h); g.rect(23, 9, 1, 2, sh);
      return;
    case 'hightop':
      g.row(0, 11, 20, h);
      for (let y = 1; y <= 7; y++) for (let x = 10; x <= 21; x++) g.set(x, y, x % 3 === 0 ? sh : y === 1 && x < 15 ? hi : h);
      for (let y = 6; y <= 11; y++) { g.set(8, y, (y % 2) ? soft : null); g.set(9, y, y < 8 ? soft : null); g.set(22, y, y < 8 ? soft : null); g.set(23, y, (y % 2) ? soft : null); }
      g.row(8, 10, 21, h);
      return;
    case 'afro':
      for (let y = 0; y <= 13; y++) {
        for (let x = 3; x <= 28; x++) {
          const inFace = y >= 9 && head[y] && x >= head[y][0] && x <= head[y][1];
          if (!inFace && (x - 15.5) ** 2 + ((y - 7) * 1.15) ** 2 <= 125) g.set(x, y, (x * 7 + y * 5) % 11 === 0 ? hi : (x * 3 + y * 2) % 7 === 0 ? sh : h);
        }
      }
      return;
    case 'braids':
      fill(g, 4, (x, y) => (x % 2 === 0 ? sh : (y + x) % 4 === 0 ? hi : h));
      return;
    case 'locs':
      fill(g, 4, lit);
      [7, 9, 22, 24].forEach((x) => { for (let y = 8; y <= 19; y++) g.set(x, y, y % 2 ? sh : h); });
      [11, 20].forEach((x) => { for (let y = 8; y <= 10; y++) g.set(x, y, y % 2 ? h : sh); });
      return;
    case 'long':
      fill(g, 4, lit);
      for (let y = 8; y <= 22; y++) { g.row(y, 7, 8, y % 3 ? h : hi); g.row(y, 23, 24, y % 3 ? sh : h); }
      g.row(23, 7, 9, h); g.row(23, 22, 24, sh);
      g.row(5, 12, 15, hi);
      return;
    default:
      fill(g, 4, lit);
  }
}
