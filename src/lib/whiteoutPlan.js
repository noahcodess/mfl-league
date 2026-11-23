// The Creepers whiteout cutscene: which plays get it and the camera on the visitors' huddle. Only the Creepers, at home,
// wearing the uniform named exactly "Whiteout" (anything else, "Whiteout!" included, gets nothing). It always plays on the
// first snap of the game (the opening kickoff comes straight out of the intro), and maybe once more on a key down by the
// visitors: never the 1st quarter, rarely the 2nd, mostly the 3rd and 4th, and not in a blowout. Picked from the plays
// alone (no dice from the game), so it never changes what happens.
import { yardX, MID_Y, YD, VIEW_H } from './fieldLayout.js';
import { STING_MID } from './pixelSwarm.js';

export const WHITEOUT_NAME = 'Whiteout';
const SNAP = new Set(['run', 'pass', 'sack', 'penalty', 'kneel', 'spike']);
const QW = { 1: 0, 2: 0.12, 3: 1, 4: 1.5 };   // how likely each quarter is for the second one (overtime: 1.8)
const hash = (a, b) => { let x = (Math.imul(a, 0x9e3779b1) ^ Math.imul(b + 0x7f4a7c15, 0x85ebca6b)) >>> 0; x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0; x ^= x >>> 16; return (x >>> 0) / 4294967296; };

// The cutscene runs to Noah's whiteout track (Whiteout Creepers.mp3, 24.3 s): the network transition, the stadium shot
// for most of the song, the transition back, the visitors' huddle, and they break it right at the end of the song
// (about 22.5 s in, with the usual 1.7 s from the snap clock starting to the break). In seconds from the start.
const MID = STING_MID / 1000;
export const SONG_LEN = 24.3;
export const WO = { shotIn: MID, back: 16, shotOut: 16 + MID, len: 20.8 };

// Is this a whiteout game? home: the home team. kits: from useGameKits.
export const isWhiteout = (home, kits) => home?.id === 'snm' && !!kits?.special && kits.home?.name === WHITEOUT_NAME;

// The plays (indexes) that get the cutscene: the first snap, plus maybe one key down later on.
export function whiteoutPlays(plays, seed = 1) {
  const first = plays.findIndex((p) => SNAP.has(p.kind) && p.kind !== 'kneel');
  if (first < 0) return new Set();
  const cands = [];
  plays.forEach((p, i) => {
    const b = p.before, pz = p.pulse, diff = Math.abs(b.score.home - b.score.away);
    if (i <= first + 3 || p.off !== 'away' || !SNAP.has(p.kind) || p.kind === 'kneel' || b.down < 3 || !pz?.show || pz.v < 55 || diff > 17) return;
    const q = QW[b.quarter] ?? 1.8;
    if (!q) return;
    const w = q * ((pz.v - 45) / 55) ** 1.5 * (b.ballOn >= 90 ? 1.6 : 1) * (b.down === 4 ? 1.3 : 1);
    cands.push([i, w]);
  });
  const out = new Set([first]);
  if (!cands.length) return out;
  const sum = cands.reduce((n, c) => n + c[1], 0);
  if (hash(seed, 77) > 0.85 * (1 - Math.exp(-sum / 0.6))) return out;   // the more big late downs there are, the likelier; a few early ones rarely do it
  let r = hash(seed, 91) * sum;
  out.add((cands.find((c) => (r -= c[1]) < 0) || cands[cands.length - 1])[0]);
  return out;
}

// The camera on the visitors' huddle, tight, while the song plays.
export function huddleCam(S) {
  const them = S.actors.filter((a) => a.side === 'away');
  if (!them.length) return null;
  const cx = them.reduce((n, a) => n + a.x, 0) / them.length, cy = them.reduce((n, a) => n + a.y, 0) / them.length, zoom = 1.8;
  return { x: yardX(cx), y: MID_Y + cy * YD * 0.92 + (VIEW_H * 0.09) / zoom, zoom };
}
