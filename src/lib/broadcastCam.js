// The broadcast camera operator. He follows the ball like a real camera: a beat behind (the field camera glides toward
// what he aims at), leading the play in the direction it's going, panning out to the sideline when the ball goes there
// (as far as the field lets him), keeping the action up out of the scorebug at the bottom of the screen, widening while
// the ball is in the air, tightening for slow motion, zooming in for replays and flags, and biting a little on a pump fake.
import { yardX, MID_Y, YD, VIEW_H } from './fieldLayout.js';

const LIVE = 1.0, AIR = 0.84, SLOW = 1.35, REPLAY = 1.6, FLAG = 1.9;

// S: the scene. cur: the scene stepped to now. phase: live | replay | flag. t: seconds into the play. slow: slow motion now.
// first: the opening kickoff (starts wide and pushes in). flag: { x, y } for the flag close-up. replay: the replay's angle
// ({ who, zoom }): it stays on that player (a receiver from his route, the defender, the runner) instead of the ball.
export function camTarget(S, cur, { phase, t, slow, first, flag, replay }) {
  if (phase === 'flag' && flag) return { x: yardX(flag.x), y: MID_Y + flag.y * YD, zoom: FLAG };
  const b = cur.ball, holder = b.holder, star = phase === 'replay' && replay?.who ? cur.by[replay.who] : null;
  let ax = b.x, ay = b.y;
  if (star) { ax = star.x + (star.vx || 0) * 0.3; ay = star.y + (star.vy || 0) * 0.25; }   // the replay's man, the whole way
  else if (b.flight) { ax = b.x + (b.flight.x1 - b.x) * 0.45; ay = b.y + (b.flight.y1 - b.y) * 0.5; }   // look ahead to where it's going
  else if (holder) { ax += (holder.vx || 0) * 0.35; ay += (holder.vy || 0) * 0.3; }                 // lead the runner
  let zoom = phase === 'replay' ? (replay?.zoom || REPLAY) : slow ? SLOW : b.flight && b.h > 3 ? AIR : LIVE;
  if (first && phase === 'live') { const k = Math.min(1, t / (S.T0 + 0.6)), e = k * k * (3 - 2 * k); zoom = 0.62 + (zoom - 0.62) * e; ay *= e; }
  const bugLift = (VIEW_H * 0.09) / zoom;   // the scorebug sits at the bottom: aim a little below the ball so it rides higher
  let x = yardX(ax), y = MID_Y + ay * YD * 0.92 + bugLift;
  // the pump fake: he leans with it for a moment before he catches himself
  if (phase === 'live' && S.pumpAt != null && t > S.pumpAt && t < S.pumpAt + 0.55) x += Math.sin(((t - S.pumpAt) / 0.55) * Math.PI) * 9 * S.dir / zoom;
  return { x, y, zoom };
}
