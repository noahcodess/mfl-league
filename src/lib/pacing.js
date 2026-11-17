// The pacing director: decides how each play is shown. Blowouts move fast (short huddles, quick whistles, no replays).
// Close games late are cinematic: longer build-up before the snap, slow motion on the big catch or the score, an instant
// replay from the same angle zoomed in, and about 15 to 20 seconds from one snap to the next (more only for a key play).
// Tuned so a full game runs about 30 minutes.
// Flags get a close-up with the call. It only changes how the game is shown, never what happens.

const MODES = {
  fast: { T0: 3.8, dead: 2.2, replayFor: () => false, slow: false, gap: 11 },
  normal: { T0: 5.4, dead: 4, replayFor: big, slow: false, gap: 18 },
  cinematic: { T0: 6.4, dead: 4.6, replayFor: big, slow: true, gap: 20 },
};
function big(p) {
  const kick = p.events.find((e) => e.type === 'kick');
  return p.result.td || p.result.turnover || p.result.safety || p.kind === 'sack' || p.result.gain >= 15 || p.onside
    || (p.kind === 'fg' && kick?.dist >= 45) || (p.before.down >= 3 && p.result.firstDown) || p.headline === 'NO GOOD'
    || p.events.some((e) => e.type === 'tackle' && e.result === 'broken') || p.events.some((e) => e.type === 'catch' && e.contested && e.result === 'catch');
}
// Replay speed: super slow for the biggest moments, slower for a big catch or hit, a quicker look at the rest.
function replaySpeed(p, mode) {
  if (p.result.td || p.result.turnover || p.result.safety) return 0.38;
  if (p.kind === 'sack' || p.result.gain >= 20) return 0.5;
  return mode === 'cinematic' ? 0.55 : 0.7;
}

// How tense the moment is: 'fast' (a blowout), 'cinematic' (close and late, overtime, or a tight two-minute drill), or 'normal'.
export function modeOf(play) {
  const b = play.before, diff = Math.abs(b.score.home - b.score.away), q = b.quarter, twoMin = (q === 2 || q === 4) && b.clock <= 120;
  if (diff >= 21 || (q >= 3 && diff >= 17)) return 'fast';
  if (q >= 5 || (q === 4 && diff <= 8) || (twoMin && diff <= 10)) return 'cinematic';
  return 'normal';
}

// Before the scene is built: { mode, T0 (seconds before the snap), dead (seconds after the whistle), keyPlay }.
export function paceFor(play) {
  const mode = modeOf(play), m = MODES[mode], key = !!play.keyPlay;
  return { mode, T0: m.T0 + (key ? 1.2 : 0), dead: m.dead + (play.result.td ? 1 : 0), keyPlay: key };
}

// After the scene is built: { slow: [[t0, t1, speed]], replay: { from, to, speed } | null, flag: { x, y, text } | null, dur }.
export function shotsFor(S, pace, names = {}) {
  const play = S.play, m = MODES[pace.mode], out = { slow: [], replay: null, flag: null };
  const res = play.events.find((e) => e.type === 'catch')?.result, caught = S.tCatch && res === 'catch';
  const air = play.events.find((e) => e.type === 'throw')?.air || 0;
  const key = caught ? S.tCatch : play.result.td || play.kind === 'sack' ? S.tEnd - 0.2 : S.tEnd - 0.6;
  if (m.slow && caught && air >= 15) out.slow.push([S.tCatch - 0.45, S.tCatch + 0.25, 0.45]);   // the ball arriving, in slow motion
  if (m.slow && play.result.td) out.slow.push([S.tEnd - 0.7, S.tEnd + 0.2, 0.5]);
  const flag = play.events.find((e) => e.type === 'flag');
  if (flag) {
    const who = names[flag.on] || S.by[flag.on]?.p;
    out.flag = { x: S.flag?.x ?? S.los, y: S.flag?.y ?? 0, text: `FLAG: ${flag.name}${who ? `, #${who.number ?? ''} ${who.last || who.name || ''}` : ''} · ${flag.yards} yards` };
  }
  let live = S.tEnd + pace.dead;
  if (m.replayFor(play)) { // the instant replay: the moment that mattered, from the same angle, zoomed in and slowed down
    const speed = replaySpeed(play, pace.mode), from = Math.max(S.T0 - 0.2, key - 2.2), to = Math.min(S.tEnd + 0.5, key + 1.4);
    const slowExtra = out.slow.reduce((x, [a, b, k]) => x + (b - a) * (1 / k - 1), 0);
    const budget = m.gap + 4 - (pace.T0 + (S.tEnd - S.T0) + pace.dead + slowExtra + (out.flag ? 2.4 : 0)) + (pace.keyPlay ? 8 : 0);   // keep snap to snap near the limit
    const len = Math.min(to - from, Math.max(0, budget) * speed);
    if (len >= 1.2) out.replay = { from: to - len, to, speed };
  }
  out.dur = live + (out.flag ? 2.4 : 0);
  return out;
}

// How fast the live action plays at time t (slow motion windows), 1 = real time.
export const slowAt = (shots, t) => (shots?.slow.find(([a, b]) => t >= a && t < b)?.[2]) || 1;
