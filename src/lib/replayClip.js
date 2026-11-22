// Builds a replay of any earlier play for the breaks (quarter recap, plays of the half): its scene, the whole play from just
// before the snap to just after the whistle, slowed so it runs about 6-7 seconds, following whatever made the play.
import { buildScene } from './sceneBuild.js';
import { paceFor } from './pacing.js';
import { replayAngle } from './replayAngle.js';

// Returns { S, rp: { from, to, speed, focus, who, zoom }, ms (how long the slide should stay up) }.
export function clipFor(play, lineups, seed) {
  const S = buildScene(play, lineups, paceFor(play), seed || 1);
  const caught = S.tCatch && play.events.find((e) => e.type === 'catch')?.result === 'catch';
  const key = caught ? S.tCatch : play.result.td || play.kind === 'sack' ? S.tEnd - 0.2 : S.tEnd - 0.6;
  const ang = replayAngle(S, play, key), from = Math.max(0, S.T0 - 0.3), to = S.tEnd + 0.5, len = to - from;
  const speed = Math.min(0.85, Math.max(0.45, len / 6.5));
  const focus = ang.focus === 'route' ? 'ball' : ang.focus;   // the whole play is shown, so the camera stays on the action
  return { S, rp: { from, to, speed, focus, who: focus === 'ball' ? null : ang.who, zoom: Math.min(ang.zoom || 1.5, 1.6) }, ms: Math.round((len / speed + 1.3) * 1000) };
}
