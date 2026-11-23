// How loud each crowd bed is right now on the commissioner's broadcast (crowdAudio plays them). Most of the game is the
// first two beds: a hush while the home team has the ball, a murmur that grows with the Stadium Pulse when the visitors do.
// The loud bed and the third-down roar only come in when the meter is up on the moments that matter (3rd and 4th downs,
// late in a close game, a big stop) and they swell in as the meter shows, right on its timing. Pure: same moment, same mix.
const sm = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const NO_SNAP = new Set(['kickoff', 'xp', 'two']);

// m: { play, t (seconds into the scene), T0, tEnd, e (crowd energy 0-1), tdAt (when a score lands, or null),
// wo: { song (the whiteout song is on), roar (they just broke the huddle) } }. Returns [hush, murmur, loud, third], each 0-1.
export function bedLevels(m) {
  const { play, t, T0, tEnd, e = 0.6, tdAt = null, wo = null } = m;
  if (!play) return [0.6, 0.3, 0, 0];
  const pz = play.pulse || {}, lv = (pz.v ?? 0) / 100, away = play.off === 'away', k = play.kind, d = play.before?.down;
  const size = 0.45 + 0.55 * e;   // a small, half-empty place never gets as loud as a sold-out big house
  if (wo?.roar) return [0, 0.65 * size, size, 0.35 * size];   // the crossfade out of the whiteout track: our crowd, very loud
  if (wo?.song) return [0, 0, 0, 0];   // the whiteout track replaces every crowd sound
  const h = play.after?.score && play.before?.score ? play.after.score.home - play.before.score.home : 0;
  if (tdAt != null && t >= tdAt && t < tdAt + 4.5) return h > 0 ? [0, 0.7 * size, 0.95 * size, 0] : [0.5, 0.35 * size, 0, 0];   // a score: the house blows up (or goes quiet)
  if (NO_SNAP.has(k)) {   // kicks: a buzz on the tee, a roar as it's struck
    const kicked = t >= T0 - 0.2 && t < tEnd + 1.5;
    return [0.35, (kicked ? 0.75 : 0.5) * size, (kicked && k === 'kickoff' ? 0.45 : 0) * size, 0];
  }
  const post = t >= tEnd, after = pz.after != null && post && t > tEnd + 0.5 && t < tEnd + 3.6;
  if (after) return [0, 0.6 * size, sm((pz.after / 100 - 0.3) / 0.45) * size, 0];   // a big stop: rides with the meter coming back up
  if (!away) {   // the home offense: they hush for the snap, wake up while it runs
    if (t < T0 || post) return [0.85, (0.18 + 0.2 * e) * size, 0, 0];
    const big = (play.result?.gain ?? 0) >= 15 && (t - T0) / Math.max(0.5, tEnd - T0) > 0.45;
    return [0.3, (0.55 + 0.2 * e) * size, big ? 0.6 * size : 0, 0];
  }
  const up = !!pz.show && t >= 0.6, crucial = d >= 3 || lv >= 0.72;   // the meter is on (it comes up at 0.6 s)
  const murmur = (0.4 + 0.6 * sm(lv * 1.5)) * size, loud = up && crucial ? sm((lv - 0.3) / 0.45) * size : 0;
  const now = t >= 0.6 && t < T0 + 0.6;   // the sustained scream, on with the meter and let go just after the snap
  const third = !now ? 0 : d >= 3 && lv >= 0.22 ? (0.6 + 0.4 * sm((lv - 0.22) / 0.5)) * size   // every real 3rd and 4th down, meter or not
    : pz.show && lv >= 0.68 ? (0.35 + 0.3 * sm((lv - 0.68) / 0.2)) * size : 0;              // and an electric house on an early down
  if (t < T0) return [0.25 * (1 - lv), murmur, loud, third];
  if (!post) return [0, Math.max(murmur, 0.7 * size), loud * 0.85, third];
  return [0.3 * (1 - lv), murmur * 0.85, 0, 0];   // back down between plays
}

// The overall level: quieter under the breaks, replays and the referee's call, silent while paused.
// v: { phase, cut (the cutscene, if any), paused, brk (a halftime/quarter break covers the field), done }.
export function masterLevel(v) {
  if (v.paused) return 0;
  if (v.brk) return 0.3;
  if (v.done) return 0.35;
  if (v.phase === 'inj' || v.phase === 'toinj') return 0.4;   // the house goes quiet for a man down
  if (v.phase === 'cut' && v.cut === 'tmw') return 0.5;   // the two-minute warning: a break
  return v.phase === 'replay' ? 0.45 : v.phase === 'call' || v.phase === 'tocall' ? 0.75 : 1;
}
