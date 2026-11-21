// The stadium shot itself: a sky cam rising slowly from the top of the lower bowl to the upper deck. It builds the stadium's
// layers once, then every frame slides them at different speeds (far things slow, near things fast), draws the fans doing
// their thing, the words running on the video ribbon, camera flashes at night, and shakes when the Bounce House jumps.
import { brightness } from './pixels.js';
import { drawPixelText, textLength } from './pixelFont.js';
import { brush } from './fieldLayout.js';
import { W, H, TRAVEL, L } from './stadiumLayout.js';
import { paintSky } from './stadiumSky.js';
import { paintLower, paintUpper } from './stadiumDecks.js';
import { paintRoof, paintPoles, paintFront } from './stadiumSupports.js';
import { makeFans, drawFan } from './crowdFans.js';
import { fanPose, cardMask, JUMP_MS } from './crowdActs.js';

const CALLS = { jump: 'JUMP JUMP JUMP', wave: 'DO THE WAVE', towels: 'WAVE YOUR TOWELS', cheer: 'MAKE SOME NOISE', cards: 'CARDS UP', lights: 'LIGHT IT UP' };

// o: { team, look, act, dress (fan color or null), theme (the alternate's name), logo (loaded image or null), stadiumName, ms, fill (0-1 how full) }.
// Returns draw(ctx, t) for a canvas that is a whole number of times bigger than 480x270.
export function makeCrowdShot(o) {
  const { team, look, act, dress } = o, nick = (team.nickname || team.name.split(' ').pop()).toUpperCase(), ms = o.ms || 3500; // the climb; the 5-second shot then holds at the top
  const far = paintSky(look), upper = paintUpper(look, team, o.logo), poles = paintPoles(look), lower = paintLower(look, team, o.logo), front = paintFront(look);
  paintRoof(upper.getContext('2d'), look);
  const fans = makeFans(team, dress, act === 'cards', o.fill ?? 1), shake = act === 'jump' && team.id === 'ddc';
  const paper = dress || team.color, ink = [team.accent, '#f2f5ee', '#16171a'].find((c) => Math.abs(brightness(c) - brightness(paper)) > 0.35);
  const env = { all: shake, towel: dress && brightness(dress) < 0.8 ? '#f4f6f8' : dress ? '#ffffff' : brightness(team.accent) > 0.5 ? team.accent : '#f4f6f8', mask: cardMask(nick), ink, paper };
  const words = `${o.theme ? `${o.theme.toUpperCase()}   ` : ''}${CALLS[act]}   GO ${nick}   ${(o.stadiumName || '').toUpperCase()}   `, wordsLen = textLength(words, 2) + 2;

  return (ctx, ms0) => {
    const t = Math.max(0, ms0); // the first frame can land a hair before the clock starts
    const S = ctx.canvas.width / W, r = brush(ctx), x = Math.min(1, t / ms), p = x * x * (3 - 2 * x) * 0.5 + x * 0.5, // steady climb that eases to a stop
       glow = [];
    const q = (t % JUMP_MS) / JUMP_MS, k = (q - 0.55) / 0.3, thud = shake && k > 0 && k < 1;
    const sy = thud ? Math.round(Math.cos(k * Math.PI * 3) * 3 * (1 - k)) : 0, sx = thud ? Math.round(Math.sin(k * Math.PI * 4) * 1.5 * (1 - k)) : 0;
    const off = (travel, near = 1) => Math.round(-(1 - p) * travel * S) / S + sy * near; // art pixels, snapped to real pixels
    const at = (y, near = 1) => { ctx.setTransform(S, 0, 0, S, Math.round(sx * near) * S, y * S); return y; };
    const crowd = (list, y0, cut) => list.forEach((f) => { const sy0 = f.y + y0; if (sy0 > -18 && sy0 < cut) { const pose = fanPose(act, f, t, env); drawFan(r, f, f.y + (pose.dy || 0), pose, glow); } });
    ctx.imageSmoothingEnabled = false;
    at(off(TRAVEL.far, 0.3), 0.3); ctx.drawImage(far, 0, 0);
    const uy = off(TRAVEL.upper), ly = off(TRAVEL.lower), mark = glow.length; // both decks move as one piece
    at(uy); ctx.drawImage(upper, 0, 0); crowd(fans.upper, uy, ly + L.rail + 16);
    for (let i = mark; i < glow.length; i += 3) glow[i + 1] += uy;
    if (poles) ctx.drawImage(poles, 0, 0);
    const mark2 = glow.length;
    at(ly); ctx.drawImage(lower, 0, 0); crowd(fans.lower, ly, H + 6);
    for (let i = mark2; i < glow.length; i += 3) glow[i + 1] += ly;
    if (act === 'lights') r(0, -ly - 6, W, H + 12, 'rgba(4,6,22,0.34)'); // dim the house so the phones show
    // the video ribbon between levels
    r(0, L.ribbon, W, L.ribbonH, look.paintLo);
    const scroll = (t * 0.045) % wordsLen;
    for (let wx = -scroll; wx < W; wx += wordsLen) drawPixelText((a, b, w, h) => r(a, b, w, h, look.led), words, wx, L.ribbon + 3, 2);
    for (let y = L.ribbon + 1; y < L.ribbon + L.ribbonH; y += 2) r(0, y, W, 1, '#00000040');
    at(0, 0);
    if (look.night && act !== 'lights') for (let i = 0; i < 7; i++) { const n = Math.floor(t / 70) * 7 + i, fx = (n * 7919) % W, fy = (n * 104729) % H; r(fx, fy, 1, 1, '#ffffff'); r(fx - 1, fy, 3, 1, '#ffffff66'); r(fx, fy - 1, 1, 3, '#ffffff66'); }
    if (act === 'lights') {
      for (let i = 0; i < glow.length; i += 3) { const gx = glow[i] + sx, gy = glow[i + 1]; if (glow[i + 2]) { r(gx - 2, gy, 5, 1, '#fff3b055'); r(gx, gy - 2, 1, 5, '#fff3b055'); r(gx - 1, gy - 1, 3, 3, '#fff7c2aa'); } else { r(gx - 1, gy, 3, 1, '#fff3b066'); r(gx, gy - 1, 1, 3, '#fff3b066'); } r(gx, gy, 1, 1, '#ffffff'); }
    }
    at(off(TRAVEL.front, 1.4), 1.4); ctx.drawImage(front, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
}
