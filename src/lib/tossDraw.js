// The coin toss at midfield: the referee (striped shirt) in the middle flipping a coin, the home coach on one side and the
// away coach on the other, in their own pixel art. Drawn over the game camera at true size (about 2 yards tall, a couple of
// yards apart) so they stay sharp as the camera zooms in.
import { coachUrl } from './coachDraw.js';
import { coachLooks } from './coachLooks.js';
import { yardX, MID_Y, YD } from './fieldLayout.js';

const TALL = 2.2 * YD; // a person, head to feet, in field pixels
const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });

// The ref is a coach drawing in a white shirt and black pants; every other pair of shirt columns is painted black for stripes.
async function referee() {
  const looks = { ...coachLooks({ team_id: 'ref' }, null), shirt: 'polo', shirtColor: '#f2f2f2', pants: 'slacks', pantsColor: '#1b1b1f', glasses: 'none' };
  const img = await load(coachUrl(looks));
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let y = 20; y < c.height; y++) for (let i = 0; i < c.width; i++) {
    const k = (y * c.width + i) * 4;
    if (p[k] === 0xf2 && p[k + 1] === 0xf2 && p[k + 2] === 0xf2 && i % 4 < 2) { p[k] = 0x16; p[k + 1] = 0x16; p[k + 2] = 0x18; }
  }
  x.putImageData(d, 0, 0);
  return c;
}

const ARC = [0, 0.25, 0.45, 0.6, 0.68, 0.6, 0.45, 0.25]; // coin height through a flip, in person-heights

// coaches: [home coach, away coach] (rows from the coaches table, or { team_id }). Resolves to overlay(ctx, toScreen, zoom, ms).
export async function makeToss(home, away, coaches) {
  const [ref, hc, ac] = await Promise.all([referee(), load(coachUrl(coachLooks(coaches[0], home))), load(coachUrl(coachLooks(coaches[1], away)))]);
  const feet = MID_Y + YD, mid = yardX(50);
  const crew = [[ac, mid - 2.2 * YD], [ref, mid], [hc, mid + 2.2 * YD]];
  return (ctx, toScreen, zoom, ms) => {
    ctx.imageSmoothingEnabled = false;
    const h = TALL * zoom, s = h / 56;
    crew.forEach(([img, wx]) => {
      const [x, y] = toScreen(wx, feet);
      ctx.fillStyle = '#0000003d'; ctx.fillRect(Math.round(x - 10 * s), Math.round(y - 2 * s), Math.round(20 * s), Math.round(4 * s));
      ctx.drawImage(img, Math.round(x - 16 * s), Math.round(y - h), Math.round(32 * s), Math.round(h));
    });
    const k = Math.floor(ms / 110) % 14, up = k < 8 ? ARC[k] : 0, flat = k >= 8;
    const [cx, cy] = toScreen(mid + 0.45 * YD, feet - TALL * (0.62 + up));
    const cw = Math.max(2, Math.round((flat ? 3.4 : 2.6) * s)), ch = Math.max(2, Math.round((flat ? 1.6 : 2.6) * s));
    ctx.fillStyle = '#000'; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, cw + 2, ch + 2);
    ctx.fillStyle = (k % 2 && !flat) ? '#b8860b' : '#ffd84a'; ctx.fillRect(Math.round(cx), Math.round(cy), cw, ch);
  };
}
