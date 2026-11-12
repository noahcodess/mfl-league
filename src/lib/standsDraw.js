// Paints everything around the field: the turf apron with both benches, the wall with its boards, and only the front rows of
// the stands with their fans (the rest of the crowd is off screen). The far side faces the camera; the near side shows backs.
// Fans are made once per team (makeFans) and redrawn a few times a second (drawFans) so they bob and throw their arms up.
// style 'spruce' builds the wall, seats and benches out of spruce wood (the Foxes).
import { shade, brightness } from './pixels.js';
import { drawPixelText, textLength } from './pixelFont.js';
import { YD, FX0, FY0, FX1, FY1, WORLD_W, WORLD_H, BORDER, WALL_TOP, WALL_BOTTOM, WALL_LEFT, WALL_RIGHT, yardX, rng, brush } from './fieldLayout.js';

const CONCRETE = '#23262d', APRON = '#2a6730', WALL = '#14161b';
const SKIN = ['#f3d2b0', '#e2b58e', '#c48a5f', '#9a6a44', '#6f4a2f'], HAIR = ['#1c1410', '#3a2618', '#6b4a2b', '#c9a45c', '#8a8d93', '#16171a'];
const pick = (on, ...cs) => [...cs, '#f2f5ee', '#16171a'].find((c) => c && Math.abs(brightness(c) - brightness(on)) > 0.33);
const ROWS_TOP = [WALL_TOP - 52, WALL_TOP - 35, WALL_TOP - 18], ROWS_BOTTOM = [WALL_BOTTOM + 14, WALL_BOTTOM + 30];
const SIDE_COLS = [4, 15, 26];
const WOOD = '#6e4b2e';

function bench(r, y, team, wood) {
  const top = wood ? WOOD : '#c9ccd2', hi = wood ? shade(WOOD, 1.3) : '#eef0f3', leg = wood ? shade(WOOD, 0.6) : '#6f7480';
  for (let x = yardX(32); x < yardX(68); x += 60) { r(x, y + 4, 52, 3, 'rgba(0,0,0,0.3)'); r(x, y, 52, 6, top); r(x, y, 52, 1, hi); if (wood) r(x + 26, y, 1, 6, leg); r(x + 3, y + 6, 3, 3, leg); r(x + 46, y + 6, 3, 3, leg); }
  [yardX(30) - 12, yardX(70) + 3].forEach((x) => { r(x, y - 2, 9, 9, '#e8761c'); r(x, y - 2, 9, 3, '#f4f4f0'); }); // water coolers
  for (let x = yardX(25); x < yardX(75); x += 18) r(x, y < FY0 ? FY0 - BORDER - 6 : FY1 + BORDER + 3, 10, 3, team.accent === team.color ? '#f2f5ee' : pick(APRON, team.accent)); // team area line
}
function planks(r, x, y, w, h, base) { r(x, y, w, h, base); for (let yy = y; yy < y + h; yy += 5) r(x, yy, w, 1, shade(base, 0.7)); for (let xx = x + 17; xx < x + w; xx += 34) r(xx, y, 1, h, shade(base, 0.7)); }

function boards(r, team, x0, x1, y, h) {
  const nick = (team.nickname || team.name.split(' ').pop()).toUpperCase(), ink = pick(team.color, team.accent);
  let i = 0;
  for (let x = x0; x < x1; x += 142, i++) {
    const w = Math.min(140, x1 - x), mine = i % 2 === 0, word = mine ? nick : 'MFL';
    r(x, y, w, h, mine ? team.color : '#0c0d10'); r(x, y, w, 1, mine ? shade(team.color, 1.35) : '#2a2d34');
    if (textLength(word) <= w - 6) drawPixelText((a, b, c, d) => r(a, b, c, d, mine ? ink : '#f2f5ee'), word, x + (w - textLength(word)) / 2, y + (h - 7) / 2);
  }
}

// The static surroundings (no fans). Call before drawField.
export function drawSurroundings(ctx, team, style = 'standard') {
  const r = brush(ctx), wood = style === 'spruce';
  const seat = wood ? shade(WOOD, 1.15) : shade(team.color, 0.55), seat2 = wood ? WOOD : shade(team.color, 0.42), step = wood ? shade(WOOD, 0.55) : '#1a1c22';
  r(0, 0, WORLD_W, WORLD_H, wood ? shade(WOOD, 0.45) : CONCRETE);
  r(0, 0, WORLD_W, ROWS_TOP[0] - 2, wood ? shade(WOOD, 0.35) : '#15171c'); // the rest of the stands, in shadow under the upper deck
  ROWS_TOP.forEach((y) => { r(0, y + 13, WORLD_W, 4, step); for (let x = 2; x < WORLD_W; x += 9) { r(x, y + 5, 7, 8, seat); r(x, y + 5, 7, 1, shade(seat, 1.4)); } });
  ROWS_BOTTOM.forEach((y) => { r(0, y - 3, WORLD_W, 3, step); for (let x = 2; x < WORLD_W; x += 9) r(x, y + 6, 7, 6, seat2); });
  SIDE_COLS.forEach((x) => { for (let y = WALL_TOP + 22; y < WALL_BOTTOM - 10; y += 13) { r(x, y + 5, 7, 7, seat); r(WORLD_W - x - 7, y + 5, 7, 7, seat); } });
  r(WALL_LEFT, WALL_TOP, WALL_RIGHT + 8 - WALL_LEFT, WALL_BOTTOM + 8 - WALL_TOP, APRON); // the floor inside the wall
  const rand = rng(31);
  for (let i = 0; i < 2600; i++) r(WALL_LEFT + rand() * (WALL_RIGHT - WALL_LEFT), WALL_TOP + rand() * (WALL_BOTTOM - WALL_TOP), 2, 1, rand() > 0.5 ? '#2f7135' : '#255c2b');
  // walls: the far one shows its face (with boards), the near one and the sides show their tops
  const wallTop = wood ? shade(WOOD, 0.8) : '#3a3e47';
  if (wood) planks(r, 0, WALL_TOP, WORLD_W, 18, shade(WOOD, 0.7)); else r(0, WALL_TOP, WORLD_W, 18, WALL);
  boards(r, team, WALL_LEFT + 12, WALL_RIGHT - 2, WALL_TOP + 2, 13); r(0, WALL_TOP, WORLD_W, 1, wood ? shade(WOOD, 1.4) : '#8d939e');
  r(0, WALL_BOTTOM, WORLD_W, 8, wallTop); r(0, WALL_BOTTOM, WORLD_W, 2, wood ? shade(WOOD, 1.3) : '#8d939e'); r(0, WALL_BOTTOM + 6, WORLD_W, 2, team.color);
  [WALL_LEFT, WALL_RIGHT].forEach((x) => { r(x, WALL_TOP, 8, WALL_BOTTOM - WALL_TOP + 8, wallTop); r(x + 3, WALL_TOP + 18, 2, WALL_BOTTOM - WALL_TOP - 18, team.color); });
  bench(r, FY0 - BORDER - 36, team, wood); bench(r, FY1 + BORDER + 16, team, wood);
}

// Fan shirts: mostly the home colors. 'bloodbath' (Dragons) puts the whole place in red.
function shirts(team, mode) {
  if (mode === 'bloodbath') return ['#b00b0a', '#d01414', '#8a0909', '#b00b0a', '#e02424', '#c41010'];
  const c = team.color;
  return [c, c, c, shade(c, 0.8), shade(c, 1.2), team.accent, '#e9ecef', '#2b2f38', c];
}

export function makeFans(team, mode) {
  const rand = rng(team.id.charCodeAt(0) * 131 + team.id.length), cols = shirts(team, mode), fans = [];
  const add = (x, y, back) => { if (rand() < 0.86) fans.push({ x, y, back, shirt: cols[Math.floor(rand() * cols.length)], skin: SKIN[Math.floor(rand() * SKIN.length)], hair: rand() < 0.22 ? cols[0] : HAIR[Math.floor(rand() * HAIR.length)], ph: Math.floor(rand() * 40) }); };
  ROWS_TOP.forEach((y) => { for (let x = 2; x < WORLD_W; x += 9) add(x, y, false); });
  SIDE_COLS.forEach((x) => { for (let y = WALL_TOP + 22; y < WALL_BOTTOM - 10; y += 13) { add(x, y, false); add(WORLD_W - x - 7, y, false); } });
  ROWS_BOTTOM.forEach((y) => { for (let x = 2; x < WORLD_W; x += 9) add(x, y, true); });
  return fans;
}

// tick: a counter that goes up a few times a second.
export function drawFans(ctx, fans, tick) {
  const r = brush(ctx);
  fans.forEach((f) => {
    const beat = (tick + f.ph) % 40, up = beat < 3, y = f.y + (beat % 8 === 5 || up ? -1 : 0);
    r(f.x + 1, y, 5, 2, f.hair);
    if (f.back) { r(f.x + 1, y + 2, 5, 3, f.hair); r(f.x + 2, y + 5, 3, 1, f.skin); }
    else { r(f.x + 1, y + 2, 5, 3, f.skin); r(f.x + 2, y + 3, 1, 1, '#1a1410'); r(f.x + 4, y + 3, 1, 1, '#1a1410'); }
    r(f.x + (up ? 1 : 0), y + (f.back ? 6 : 5), up ? 5 : 7, f.back ? 6 : 7, f.shirt); r(f.x + 5, y + 6, 1, 6, shade(f.shirt, 0.75));
    if (up) { r(f.x, y, 1, 5, f.skin); r(f.x + 6, y, 1, 5, f.skin); } else if (!f.back) { r(f.x, y + 10, 1, 2, f.skin); r(f.x + 6, y + 10, 1, 2, f.skin); }
  });
}
