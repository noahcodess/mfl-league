// Clock management for both coaches: what the offense wants from the clock right now (stop it or run it), how fast it
// snaps, when either side burns a timeout, when a hurrying offense with no timeouts spikes it, and whether a ball carrier
// gets out of bounds. The coach and his players always want the same thing: the play caller, the tempo and the runner
// all read clockGoal, so a team racing the clock throws to the sideline AND its runners get out, and a team killing the
// clock runs AND its runners stay in bounds. Smarter (Clutch) coaches manage the end of a half better.
const secondsLeft = (s) => (s.ot ? 0 : (4 - s.quarter) * s.qlen + s.clock);
const leadOf = (s, side) => s.score[side] - s.score[side === 'home' ? 'away' : 'home'];

// What the team with the ball wants from the clock: 'stop' (two-minute drill, behind late), 'run' (protecting a lead,
// way ahead) or null (play normal football).
export function clockGoal(G) {
  const s = G.s, up = leadOf(s, s.poss), t = secondsLeft(s), late = s.quarter === 4 && !s.ot;
  if ((s.quarter === 2 && s.clock < 75) || (late && up < 0 && t < 210) || (late && up < -8 && t < 420)) return 'stop';
  if ((late && up > 0 && t < 330) || (s.quarter >= 3 && up >= 17) || up >= 24) return 'run';
  return null;
}

// How many seconds run off before the next snap when the clock is moving.
export function tempo(G) {
  const goal = clockGoal(G), { R } = G;
  return goal === 'stop' ? R.int(9, 14) : goal === 'run' ? R.int(36, 39) : R.int(24, 32);
}

// Does the ball carrier end up out of bounds? base: how often this kind of play ends there in normal football (rare:
// runners fight to stay in bounds; outside runs and scrambles a bit more than catches). A runner who wants the clock stopped heads for the sideline and gives up
// a yard to get there (smarter, more aware players find it more often); one killing the clock cuts back inside and takes
// the hit. Returns { oob, gain }.
export function outOfBounds(G, carrier, base, gain) {
  const goal = clockGoal(G), r = carrier?.r || {}, iq = ((r.vision ?? r.awareness ?? r.route_running ?? 60) - 60) / 100;
  if (goal === 'stop') { const oob = G.R.chance(Math.min(0.85, base * 4 + 0.16 + iq * 0.4)); return { oob, gain: oob && gain > 3 ? gain - 1 : gain }; }
  if (goal === 'run') return { oob: G.R.chance(base * 0.12), gain };
  return { oob: G.R.chance(base), gain };
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
