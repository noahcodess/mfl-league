// The referee's announcement after a flag, on the field. Like the NFL, it's the referee (white cap) who announces it: he
// walks away from the players to a clear spot, the camera settles in the middle of the screen on him, and he turns to it
// and acts out the call, slow and smooth: the foul signal, a point at the team that fouled, and the first-down point when
// it's an automatic first down. Returns his pose for sceneDraw and the camera shot for PixelGame.
import { armsFor, blendArms, ease } from './refSprite.js';
import { MID_Y, YD, yardX } from './fieldLayout.js';
import { dist } from './sceneCore.js';

export const CALL_LEN = 7.8;   // seconds the close-up lasts
export const CALL_PANEL = 1.5; // when the striped panel comes in (he's nearly at his spot)
const WALK = 1.9, REST = [8, 0, 8, 0];

// A spot 8-11 yards from the ball with nobody near it, not far from where he is, toward the middle of the field.
function clearSpot(S, ref) {
  const others = S.actors.concat(S.refs.filter((r) => r !== ref)), b = S.ball;
  let best = null;
  for (const r of [8, 11]) for (let a = 0; a < 360; a += 30) {
    const x = b.x + Math.cos((a * Math.PI) / 180) * r, y = b.y + Math.sin((a * Math.PI) / 180) * r * 0.8;
    if (x < 3 || x > 97 || Math.abs(y) > 20) continue;
    const room = Math.min(6, ...others.map((o) => dist(o.x, o.y, x, y)));
    const score = room - 0.06 * dist(ref.x, ref.y, x, y) - 0.03 * Math.abs(y);
    if (!best || score > best.score) best = { x, y, score };
  }
  return best || { x: ref.x, y: ref.y };
}

// The signal sequence once he's there: u = seconds since he turned to the camera.
function armsAt(call, u, dir) {
  const off = call.off ? -dir : dir, steps = [[call.signal, 0.5, 3.0], ['point', 0.5, 1.1]];
  if (call.first) steps.push(['first', 0.5, 0.9]);
  let prev = REST, t = u;
  for (const [sig, blend, hold] of steps) {
    const pd = sig === 'point' ? off : dir, now = armsFor(sig, Math.max(0, t), pd, 0.55);
    if (t < blend) return blendArms(prev, now, ease(t / blend));
    if (t < blend + hold) return now;
    prev = armsFor(sig, blend + hold, pd, 0.55); t -= blend + hold;
  }
  return blendArms(prev, REST, ease(t / 0.6));
}

// S: the scene, frozen at the end of the play. call: penaltyCall's result. hold: seconds into the close-up.
export function callStage(S, call, hold) {
  const ref = S.refs?.find((r) => r.code === 'R'); if (!ref || !call) return null;
  const spot = (S.callSpot ||= clearSpot(S, ref)), k = ease(hold / WALK), d = dist(ref.x, ref.y, spot.x, spot.y);
  const x = ref.x + (spot.x - ref.x) * k, y = ref.y + (spot.y - ref.y) * k, aim = { x: spot.x, y: spot.y };
  if (hold < WALK && d > 0.6) {   // walking (a jog if it's far) over to his spot
    const face = Math.sign(spot.x - ref.x) || ref.face || 1, pose = d > 7 ? 'refjog' : 'refwalk';
    return { code: 'R', x, y, aim, pose, frame: Math.floor(d * k * (pose === 'refjog' ? 2.1 : 2.6)) % 4, face };
  }
  return { code: 'R', x, y, aim, arms: armsAt(call, hold - WALK, S.dir || 1) };
}

// The shot: his spot in the middle of the screen, framed from his feet to just over his cap.
export const callCam = (cp) => ({ x: yardX(cp.aim.x), y: MID_Y + cp.aim.y * YD - 14, zoom: 3.4 });
