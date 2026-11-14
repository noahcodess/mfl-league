// The people in the stadium shot: makes every fan in both decks (skin, hair, hat, shirt, whether they brought a sign or a foam
// finger) and draws one fan in a pose. Lower-bowl fans are big, upper-deck fans small. dress puts every fan in one color.
import { shade, brightness } from './pixels.js';
import { rng } from './fieldLayout.js';
import { seatSpots } from './stadiumLayout.js';

const SKIN = ['#f3d2b0', '#e2b58e', '#c48a5f', '#9a6a44', '#6f4a2f'], HAIR = ['#1c1410', '#3a2618', '#6b4a2b', '#c9a45c', '#8a8d93', '#16171a'];
const EYE = '#1a1410', MOUTH = '#5a1a1a', PAPER = '#f3efe2';
const TOWEL = { big: [[1, -3, 4, 2], [-1, -5, 3, 3], [-4, -3, 4, 2], [-1, -5, 3, 3]], small: [[1, -2, 3, 1], [0, -3, 2, 2], [-3, -2, 3, 1], [0, -3, 2, 2]] };

function closet(team, dress) {
  if (dress) { const d = brightness(dress) > 0.8 ? 0.93 : 1.14; return [dress, dress, dress, shade(dress, 0.9), shade(dress, d)]; }
  const c = team.color;
  return [c, c, c, c, shade(c, 0.8), shade(c, 1.2), team.accent, team.accent, '#e9ecef', '#2b2f38', '#8a8f99'];
}

// Returns { upper: [...], lower: [...] }, each back row first.
// grid: line the upper deck up for a card stunt.
export function makeFans(team, dress, grid) {
  const rand = rng(team.id.charCodeAt(0) * 131 + team.id.length + (dress ? 7 : 0)), shirts = closet(team, dress), any = (a) => a[Math.floor(rand() * a.length)];
  const trim = dress ? (brightness(dress) > 0.5 ? shade(dress, 0.7) : shade(dress, 1.5)) : null;
  const deck = (name) => seatSpots(name, grid).filter(() => rand() < (name === 'upper' ? 0.99 : 0.975)).map((s) => {
    const shirt = any(shirts), hat = rand() < (dress ? 0.5 : 0.3) ? dress || any([team.color, team.accent]) : null, roll = rand();
    return { ...s, shirt, lo: shade(shirt, 0.72), skin: any(SKIN), hair: any(HAIR), hat, brim: hat && shade(hat, 0.7), ph: rand(),
      prop: roll < 0.03 ? 'sign' : roll < 0.1 ? 'finger' : null, jersey: rand() < 0.4, trim: trim || (shirt === team.accent ? team.color : team.accent), ink: any([team.color, team.accent, '#16171a']) };
  });
  return { upper: deck('upper'), lower: deck('lower') };
}

// r: a brush. y: where the top of the fan's head is right now. p: { arms: 'up' | 'l' | 'r', lean, item, frame, color }.
// glow: phone lights get pushed here so they can be painted after the stadium is dimmed.
export function drawFan(r, f, y, p, glow) {
  const b = f.big, x = f.x;
  if (p.item === 'card') { r(x, y, b ? 10 : 6, b ? 13 : 7, p.color); r(x, y, b ? 10 : 6, 1, shade(p.color, 1.3)); return; }
  const hh = b ? 6 : 3, by = y + hh, bw = b ? 7 : 5, bh = b ? 9 : 6, bx = x + (b ? 1 : 0), rx = x + (b ? 8 : 4), top = y - (b ? 2 : 1), len = b ? 6 : 4;
  r(bx, by, bw, bh, f.shirt); r(bx + bw - 1, by, 1, bh, f.lo);
  if (b && f.jersey) r(x + 3, by + 2, 3, 3, f.trim);
  r(x + (b ? 2 : 1), y, b ? 5 : 3, hh, f.skin); r(x + (b ? 2 : 1), y, b ? 5 : 3, b ? 2 : 1, f.hat || f.hair);
  if (b) { if (f.hat) r(x + 1, y + 2, 7, 1, f.brim); r(x + 3, y + 3, 1, 1, EYE); r(x + 5, y + 3, 1, 1, EYE); if (p.arms) r(x + 4, y + 5, 1, 1, MOUTH); }
  const lean = p.lean || 0, both = p.arms === 'up';
  const arm = (ax, up) => { if (up) { r(ax, by - 1, 1, 3, f.shirt); r(ax + lean, top, 1, len, f.skin); } else if (b) { r(ax, by + 1, 1, 5, f.shirt); r(ax, by + 6, 1, 1, f.skin); } };
  arm(x, both || p.arms === 'l'); arm(rx, both || p.arms === 'r');
  const hx = rx + lean;
  if (p.item === 'towel') { const [dx, dy, w, h] = (b ? TOWEL.big : TOWEL.small)[p.frame % 4]; r(hx + dx, top + dy + 2, w, h, p.color); if (b) r(hx + dx, top + dy + 1 + h, w, 1, shade(p.color, 0.8)); }
  else if (p.item === 'finger') { r(hx - 1, top - (b ? 4 : 2), b ? 3 : 2, b ? 5 : 3, f.trim); r(hx, top - (b ? 7 : 4), 1, b ? 3 : 2, f.trim); }
  else if (p.item === 'sign') { r(x - 1, top - (b ? 6 : 3), b ? 11 : 7, b ? 7 : 4, PAPER); r(x - 1, top - (b ? 6 : 3), b ? 11 : 7, 1, f.ink); r(x, top - (b ? 4 : 2), b ? 9 : 5, b ? 2 : 1, f.ink); if (b) r(x + 1, top - 1, 6, 1, f.trim); }
  else if (p.item === 'light' && glow) glow.push(hx, top - 1, b);
}
