// Paints the two seating levels of the stadium shot (no fans): the lower layer (lower bowl seats and stairs, the concourse
// wall with its tunnels and banners, the suites, and the frame of the video ribbon between levels) and the upper deck.
import { shade } from './pixels.js';
import { drawPixelText, textLength } from './pixelFont.js';
import { brush, rng } from './fieldLayout.js';
import { W, TRAVEL, L, U, AISLES, layer, inAisle } from './stadiumLayout.js';

function rows(r, d, deck, look, h) {
  const big = deck === 'lower', seat = big ? look.seat : look.seatLo, w = big ? 9 : 5;
  r(0, d.rows - 3, W, h, look.concreteLo);
  for (let i = 0; i < d.n + 2; i++) {
    const y = d.rows + i * d.rowH;
    r(0, y + d.rowH - 4, W, 4, shade(look.concrete, 0.7)); r(0, y + d.rowH - 4, W, 1, shade(look.concrete, 0.95));
    for (let x = big ? 1 + (i % 2) * 5 : 1; x + w <= W; x += d.pitch) {
      if (inAisle(x, w, deck)) continue;
      r(x, y + (big ? 5 : 3), w, big ? 6 : 4, seat); r(x, y + (big ? 5 : 3), w, 1, shade(seat, 1.45));
    }
  }
  AISLES[deck].forEach((ax) => { // stairs with yellow step edges and a handrail
    r(ax, d.rows - 3, d.aisle, h, look.concrete);
    for (let y = d.rows; y < h; y += d.rowH) { r(ax, y + d.rowH - 4, d.aisle, 1, '#e3bf3c'); r(ax, y + d.rowH - 3, d.aisle, 3, look.concreteLo); }
    if (big) for (let y = d.rows + 6; y < h; y += d.rowH * 2) { r(ax + 5, y, 2, d.rowH, '#aeb5c0'); r(ax + 5, y, 2, 1, '#e4e8ee'); }
  });
}

function banner(ctx, r, look, logo, x, y, w, h) {
  r(x, y, w, h, look.paint); r(x, y, w, 1, look.paintHi); r(x, y + h - 2, w, 2, look.paintLo); r(x + w - 1, y, 1, h, look.paintLo);
  if (logo) { ctx.imageSmoothingEnabled = false; ctx.drawImage(logo, x + (w - h + 4) / 2, y + 2, h - 4, h - 4); } else r(x + 4, y + 4, w - 8, 2, look.trim);
}

export function paintLower(look, team, logo) {
  const c = layer(TRAVEL.lower), ctx = c.getContext('2d'), r = brush(ctx), rand = rng(77);
  rows(r, L, 'lower', look, c.height);
  // concourse wall: tunnels over each stairway, section signs, team banners, a glass rail in front of the top row
  r(0, L.wall, W, L.wallH, look.concrete); r(0, L.wall, W, 2, look.concreteHi);
  for (let i = 0; i < 260; i++) r(rand() * W, L.wall + 3 + rand() * (L.wallH - 6), 2, 1, rand() > 0.5 ? look.concreteHi : look.concreteLo);
  for (let x = 0; x < W; x += 40) r(x, L.wall + 2, 1, L.wallH - 2, look.concreteLo);
  AISLES.lower.forEach((ax, i) => {
    r(ax - 6, L.wall + 7, 24, L.wallH - 7, look.paintLo); r(ax - 4, L.wall + 9, 20, L.wallH - 9, '#07080b');
    r(ax - 4, L.wall + 9, 20, 3, '#1c2029'); r(ax + 2, L.wall + 18, 8, L.wallH - 18, '#11141a'); // light spilling down the tunnel
    r(ax + 22, L.wall + 9, 21, 11, '#0c0d11'); r(ax + 22, L.wall + 9, 21, 1, look.paint);
    drawPixelText((a, b, w, h) => r(a, b, w, h, '#f2f5ee'), `1${i}${i + 1}`, ax + 24, L.wall + 11);
    banner(ctx, r, look, logo, ax - 44, L.wall + 6, 30, 22); banner(ctx, r, look, logo, ax + 50, L.wall + 6, 30, 22);
  });
  r(0, L.wall + L.wallH - 6, W, 5, 'rgba(190,225,245,0.2)'); r(0, L.wall + L.wallH - 6, W, 1, '#dfe6ee');
  for (let x = 4; x < W; x += 20) r(x, L.wall + L.wallH - 6, 1, 6, '#9aa3af');
  // suites: lit glass boxes with people inside, under a band in the team color
  r(0, L.suites, W, L.suitesH, '#0c0e13');
  for (let x = 2; x < W; x += 48) {
    r(x, L.suites + 5, 44, L.suitesH - 12, look.glass); r(x, L.suites + 5, 44, 5, shade(look.glass, 1.35)); r(x, L.suites + L.suitesH - 12, 44, 5, shade(look.glass, 0.75));
    for (let px = x + 2; px < x + 37; px += 8 + Math.floor(rand() * 6)) { const hgt = 7 + Math.floor(rand() * 4), who = rand() > 0.5 ? '#262b38' : '#343a4a'; r(px, L.suites + L.suitesH - 7 - hgt, 6, hgt, who); r(px + 1, L.suites + L.suitesH - 11 - hgt, 4, 4, who); }
    r(x + 21, L.suites + 5, 1, L.suitesH - 12, '#0c0e13'); r(x + 6, L.suites + 7, 8, 1, '#ffffffaa');
  }
  r(0, L.suites, W, 4, look.paint); r(0, L.suites, W, 1, look.paintHi); r(0, L.suites + L.suitesH - 7, W, 7, look.concrete); r(0, L.suites + L.suitesH - 7, W, 1, look.concreteHi);
  // the fascia between levels: video ribbon frame (the words are drawn live), shadow underneath, glass rail on top
  r(0, L.ribbon - 2, W, L.ribbonH + 4, '#050608'); r(0, L.ribbon + L.ribbonH + 2, W, 2, '#00000088');
  r(0, L.rail, W, 4, 'rgba(190,225,245,0.22)'); r(0, L.rail, W, 1, '#eef2f6');
  for (let x = 6; x < W; x += 24) r(x, L.rail, 1, 4, look.steelHi);
  return c;
}

export function paintUpper(look, team, logo) {
  const c = layer(TRAVEL.upper), ctx = c.getContext('2d'), r = brush(ctx), nick = (team.nickname || team.name.split(' ').pop()).toUpperCase();
  rows(r, U, 'upper', look, c.height);
  if (look.kind !== 'arch') { // back wall: panels, the team's name, banners (the stone stadiums get an arcade instead)
    r(0, U.wall, W, U.wallH, look.concreteLo); r(0, U.wall + U.wallH - 3, W, 3, look.paint); r(0, U.wall + U.wallH - 3, W, 1, look.paintHi);
    for (let x = 0; x < W; x += 30) r(x, U.wall, 1, U.wallH - 3, '#00000055');
    const len = textLength(nick, 2);
    for (let x = 34; x + len < W; x += len + 96) {
      drawPixelText((a, b, w, h) => r(a, b, w, h, look.trim === look.paint ? '#f2f5ee' : shade(look.concrete, 1.7)), nick, x, U.wall + 5, 2);
      banner(ctx, r, look, logo, x + len + 34, U.wall + 3, 26, 18);
    }
  }
  return c;
}
