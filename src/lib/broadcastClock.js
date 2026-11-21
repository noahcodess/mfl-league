// The scorebug clocks during the broadcast: the game clock ticks down through the play, keeps running through the dead
// time and the next pre-snap when the clock didn't stop (that runoff is squeezed into the few seconds we show), and the
// play clock counts down from 24 (it starts at the whistle) to the snap.
import { paceFor } from './pacing.js';
import { PLAY_CLOCK } from './simClock.js';

const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k)), PC = PLAY_CLOCK;   // the play clock

// game: the playGame result. i: play index. t: seconds into this play's scene. S: the scene. phase: live | flag | replay.
// Returns { clock (seconds left in the quarter), playClock, running }.
export function clockFace(game, i, t, S, phase, dead) {
  const play = game.plays[i], prev = game.plays[i - 1], next = game.plays[i + 1];
  if (!play || !S) return { clock: 0, playClock: PC, running: false };
  const b4 = play.before.clock, af = play.after.clock;
  // runoff between the last play and this snap (zero if the clock had stopped), split between its dead time and our pre-snap
  const prevRun = prev && prev.after.quarter === play.before.quarter ? Math.max(0, prev.after.clock - b4) : 0;
  const prevPace = prev ? paceFor(prev) : null, prevShare = prevPace ? prevPace.dead / (prevPace.dead + S.T0) : 0;
  const nextRun = next && next.before.quarter === play.after.quarter ? Math.max(0, af - next.before.clock) : 0;
  const share = next ? dead / (dead + paceFor(next).T0) : 0;
  const snapPc = play.clock?.playClockAtSnap ?? (prevRun ? Math.max(1, Math.min(PC, Math.round(PC - prevRun))) : 8 + ((play.n * 7) % 6));
  if (t < S.T0) { // before the snap
    const start = b4 + prevRun * (1 - prevShare), pcStart = prevRun ? Math.round(PC - prevRun * prevShare) : PC;
    return { clock: lerp(start, b4, t / S.T0), playClock: Math.round(lerp(pcStart, snapPc, t / S.T0)), running: prevRun > 0 };
  }
  if (t < S.tEnd || phase !== 'live' && t < S.tEnd) return { clock: lerp(b4, af, (t - S.T0) / Math.max(0.5, S.tEnd - S.T0)), playClock: snapPc, running: true };
  const deadK = phase === 'live' ? (t - S.tEnd) / Math.max(0.5, dead) : 1;            // after the whistle
  return { clock: af - nextRun * share * Math.min(1, deadK), playClock: nextRun ? Math.round(PC - nextRun * share * Math.min(1, deadK)) : PC, running: nextRun > 0 && phase === 'live' };
}
