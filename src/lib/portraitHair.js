// Pixel hairstyles for player portraits. Each style paints over the head and follows the head's width.
import { shade, mix } from './pixels.js';

export function drawHair(g, L, head) {
  const h = L.hair, hi = shade(h, 1.45), sh = shade(h, 0.68);
  const soft = mix(L.skin, h, 0.6);
  const lift = Math.min(...Object.keys(head).map(Number)) - 6; // long heads sit one row higher
  const [a, b] = head[8];
  const lit = (x, y) => ((x * 5 + y * 3) % 11 === 0 ? hi : x >= b - 1 ? sh : h);
  // Hair cap from row `top` to the hairline (row 8): narrow at the top, a pixel wider than the head lower down.
  const fill = (top, paint, bottom = 8) => {
    top += lift;
    for (let y = top; y <= bottom; y++) {
      const [l, r] = y === top ? [a + 2, b - 2] : y === top + 1 ? [a, b] : [a - 1, b + 1];
      for (let x = l; x <= r; x++) {
        const c = paint(x, y);
        g.set(x, y, c && y === bottom ? shade(c, 0.8) : c);
      }
    }
  };
  const sideburns = (rows = 3) => { g.rect(a - 1, 9, 1, rows, h); g.rect(b + 1, 9, 1, rows, sh); };
  switch (L.style) {
    case 'bald':
      g.set(12, 7 + lift, shade(L.skin, 1.35)); g.set(13, 7 + lift, shade(L.skin, 1.25)); g.set(12, 8 + lift, shade(L.skin, 1.2));
      return;
    case 'buzz':
      fill(5, (x, y) => (y === 8 && x % 2 ? null : soft));
      return;
    case 'crew':
      fill(5, (x, y) => (y === 5 + lift && x % 2 ? soft : lit(x, y)));
      return;
    case 'waves':
      fill(4, (x, y) => ((x + (y % 2) * 2) % 4 === 0 ? hi : (x + y) % 2 ? h : sh));
      return;
    case 'short':
      fill(4, lit); g.row(5 + lift, 12, 15, hi); sideburns();
      return;
    case 'side':
      fill(4, lit); g.rect(12, 4 + lift, 1, 3, sh);
      g.row(9, a, 12, h); g.row(10, a, a + 1, h); g.row(5 + lift, 13, 17, hi); g.rect(b + 1, 9, 1, 2, sh);
      return;
    case 'curtains':
      fill(3, (x, y) => (x >= 15 && x <= 16 && y <= 5 + lift ? sh : lit(x, y)));
      g.row(9, a, 13, h); g.row(10, a, 11, h); g.row(9, 18, b, sh); g.row(10, b - 1, b, sh); sideburns(2);
      return;
    case 'fade':
      fill(3, (x, y) => (y >= 6 && (x < a + 1 || x > b - 1) ? ((x + y) % 2 ? soft : null) : lit(x, y)));
      for (let y = 9; y <= 11; y++) if (y % 2) { g.set(a - 1, y, soft); g.set(b + 1, y, soft); }
      return;
    case 'spiky':
      for (let x = a + 1; x <= b - 1; x += 2) { g.set(x, 1 + lift, h); g.set(x, 2 + lift, hi); }
      fill(3, lit); sideburns(2);
      return;
    case 'messy':
      [11, 14, 17, 20].forEach((x) => g.set(x, 2 + lift, h));
      fill(3, (x, y) => (y === 3 + lift && (x === 13 || x === 18) ? null : lit(x, y)));
      g.row(9, a, a + 2, h); g.set(15, 9, h); g.row(9, b - 2, b, sh); g.set(a + 1, 10, h); g.set(b - 1, 10, sh);
      g.set(12, 4 + lift, hi); g.set(16, 3 + lift, hi); g.set(18, 5 + lift, hi); sideburns();
      return;
    case 'curly':
      fill(2, (x, y) => (y === 2 + lift && x % 2 ? null : (x * 3 + y * 5) % 4 === 0 ? hi : (x + y * 2) % 5 === 0 ? sh : h));
      sideburns(2);
      return;
    case 'flattop':
      for (let y = 1 + lift; y <= 8; y++) for (let x = a + 1; x <= b - 1; x++) g.set(x, y, y === 1 + lift ? hi : x % 4 === 0 ? sh : h);
      for (let y = 6; y <= 11; y++) if (y % 2) { g.set(a - 1, y, soft); g.set(b + 1, y, soft); }
      return;
    case 'hightop':
      for (let y = lift; y <= 7 + lift; y++) for (let x = a + 1; x <= b - 1; x++) g.set(x, y, x % 3 === 0 ? sh : y === 1 + lift && x < 15 ? hi : h);
      for (let y = 6; y <= 11; y++) { if (y % 2) { g.set(a - 1, y, soft); g.set(b + 1, y, soft); } }
      g.row(8, a + 1, b - 1, sh);
      return;
    case 'mohawk':
      fill(5, (x, y) => ((x + y) % 2 ? soft : null));
      for (let y = 1 + lift; y <= 8; y++) for (let x = 14; x <= 17; x++) g.set(x, y, x === 14 ? hi : x === 17 ? sh : h);
      return;
    case 'manbun':
      fill(5, (x, y) => ((x * 7 + y) % 9 === 0 ? hi : x >= b ? sh : h));
      for (let y = 1 + lift; y <= 4 + lift; y++) g.row(y, y === 1 + lift || y === 4 + lift ? 14 : 13, y === 1 + lift || y === 4 + lift ? 17 : 18, y === 2 + lift ? hi : h);
      return;
    case 'mullet':
      fill(4, lit); sideburns();
      for (let y = 13; y <= 23; y++) { g.row(y, a - 2, a - 1, y % 3 ? h : hi); g.row(y, b + 1, b + 2, y % 3 ? sh : h); }
      return;
    case 'afro':
      for (let y = 0; y <= 13; y++) for (let x = 3; x <= 28; x++) {
        const inFace = y >= 9 && head[y] && x >= head[y][0] && x <= head[y][1];
        if (!inFace && (x - 15.5) ** 2 + ((y - 7) * 1.15) ** 2 <= 125) g.set(x, y, (x * 7 + y * 5) % 11 === 0 ? hi : (x * 3 + y * 2) % 7 === 0 ? sh : h);
      }
      return;
    case 'twists':
      fill(1, (x, y) => ((x - a) % 3 === 0 ? sh : (y + x) % 3 === 0 ? hi : h));
      for (let x = a; x <= b; x += 3) g.set(x, 0 + lift, h);
      return;
    case 'braids':
      fill(4, (x, y) => (x % 2 === 0 ? sh : (y + x) % 4 === 0 ? hi : h));
      return;
    case 'locs':
      fill(4, lit);
      for (let y = 8; y <= 20; y++) {
        for (let x = a - 2; x <= a; x++) g.set(x, y, (x + y) % 3 === 0 ? hi : (x - a) % 2 ? sh : h);
        for (let x = b; x <= b + 2; x++) g.set(x, y, (x + y) % 3 === 0 ? h : (x - b) % 2 ? h : sh);
      }
      for (let x = a + 1; x <= b - 1; x += 3) g.rect(x, 9, 1, 2, (x % 2) ? h : sh);
      return;
    case 'long':
      fill(4, lit);
      for (let y = 8; y <= 22; y++) { g.row(y, a - 2, a - 1, y % 3 ? h : hi); g.row(y, b + 1, b + 2, y % 3 ? sh : h); }
      g.row(23, a - 2, a, h); g.row(23, b, b + 2, sh); g.row(5 + lift, 12, 15, hi);
      return;
    default:
      fill(4, lit);
  }
}
