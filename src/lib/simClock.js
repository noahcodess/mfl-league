// Clock management for both coaches: how fast the offense snaps (hurry-up, normal, milking it), when either side burns a
// timeout, and when a hurrying offense with no timeouts spikes it. Smarter (Clutch) coaches manage the end of a half better.
const secondsLeft = (s) => (s.ot ? 0 : (4 - s.quarter) * s.qlen + s.clock);
const leadOf = (s, side) => s.score[side] - s.score[side === 'home' ? 'away' : 'home'];

// How many seconds run off before the next snap when the clock is moving.
export function tempo(G) {
  const { R, s } = G, up = leadOf(s, s.poss), t = secondsLeft(s);
  if ((s.quarter === 2 && s.clock < 75) || (s.quarter === 4 && up < 0 && t < 210)) return R.int(9, 14);         // hurry-up
  if ((s.quarter === 4 && up > 0 && t < 330) || (s.quarter >= 3 && up >= 17) || up >= 24) return R.int(36, 39);   // milking it
  return R.int(24, 32);
}

// With the clock running before a snap: does someone stop it? Returns { side, kind: 'timeout' } or { kind: 'spike' } or null.
export function clockStop(G) {
  const { s, R } = G, o = s.poss, d = o === 'home' ? 'away' : 'home', late = s.quarter === 4 && !s.ot, half = s.quarter === 2;
  const offUp = leadOf(s, o), t = secondsLeft(s), toGoal = 100 - s.ballOn;
  const sharp = (side) => G.teams[side].plan?.clutch ?? 0.6;
  // the defense, behind late, stops the clock to get the ball back (a sharp coach doesn't wait too long)
  if (late && offUp > 0 && offUp <= 16 && s.to[d] > 0 && s.clock < 120 + sharp(d) * 60 && t > 0) return { side: d, kind: 'timeout' };
  // the offense racing the clock: needs points before the half or the game ends
  const racing = (half && s.clock < 40 && toGoal < 60) || (late && offUp <= 0 && offUp >= -16 && s.clock < 100);
  if (racing) {
    if (s.to[o] > 0 && (s.clock < 30 || toGoal < 40 || R.chance(sharp(o) * 0.6))) return { side: o, kind: 'timeout' };
    if (s.to[o] === 0 && s.clock < 35 && s.down < 3 && s.clock > 3) return { kind: 'spike' };
  }
  return null;
}
