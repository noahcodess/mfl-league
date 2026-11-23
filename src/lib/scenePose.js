// Decides how each player looks this frame: which way he faces (front, back or side, left or right) and which pose and
// frame he's in. It reads the live player (where he's moving and how fast, what he's doing), so the picture always matches
// the motion. Linemen and anyone squared up to an opponent keep facing their man however they get shoved.
const SIDE_ONLY = ['rocked', 'olset', 'dlset', 'qbset', 'rbset', 'wrset', 'cbset', 'lbset', 'qbready', 'qbdrop', 'throw', 'block', 'anchor', 'driven', 'drive', 'swim', 'rush',
  'reach', 'drop', 'cut', 'juke', 'stiff', 'kick', 'kneel', 'backpedal', 'tackle', 'wrap', 'layout', 'stumble', 'pump',
  'catch', 'hands', 'shoulder', 'highpoint', 'onehand', 'scoop', 'contest', 'swat', 'stretch', 'plant', 'plantc', 'breakdown', 'stutter', 'truck'];
const PREFER = { cheer: 'front', ...Object.fromEntries(SIDE_ONLY.map((k) => [k, 'side'])) };
const SQUARE = new Set(['rocked', 'breakdown', 'olset', 'dlset', 'qbset', 'rbset', 'wrset', 'cbset', 'lbset', 'block', 'anchor', 'driven', 'drive', 'swim', 'rush', 'throw', 'pump', 'kick', 'stiff', 'qbready', 'qbdrop', 'backpedal']);
const SPIN = [['side', 1], ['front', 1], ['side', -1], ['back', 1]];
const beat = (a) => { if (a.beat) return a.beat; let h = 7; for (const ch of String(a.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (a.beat = { per: 0.22 + (h % 7) * 0.035, off: (h % 97) / 97 }); };

// a: a live actor (sceneCore). holder: the actor with the ball, or null. Returns { view, face, pose, frame }.
export function lookAt(a, t, S, holder) {
  const speed = Math.hypot(a.vx, a.vy), moving = speed > 0.7, mine = holder === a, back = a.backUntil && t < a.backUntil && moving;
  let view = a.vis?.view || 'side', face = a.vis?.face || a.face, pose;
  let fallK = -1;
  if (a.hurt && t >= a.hurt.at + 0.45) {   // hurt: down in one of the five hurt poses, breathing hard (slower as the seconds go by)
    const el = t - a.hurt.at; a.vis = { view: 'side', face: a.hurt.face };
    return { view: 'side', face: a.hurt.face, pose: a.hurt.pose, frame: Math.floor(el * Math.max(1.8, 3.2 - el * 0.12)) & 1 };
  }
  if (a.down) {   // going down: the fall frames, then lying there (face down, or on his back)
    const f = a.fall || {}; if (f.face == null) f.face = a.vis?.face || a.face || 1;
    fallK = f.t0 != null && t - f.t0 < f.dur ? Math.min(3, Math.floor(((t - f.t0) / f.dur) * 4)) : 4;
    pose = fallK < 4 ? (f.back ? 'fallB' : 'fallF') : f.back ? 'downB' : 'down'; face = f.face;
  }
  else if (a.pose === 'tackle') pose = 'dive';
  else if (a.celebrate || a.pose === 'cheer') pose = 'cheer';
  else if (a.pose === 'spin') pose = 'spin';
  else if (a.pose) pose = a.pose;
  else if (a.qb && mine && t > S.T0 + 0.15) pose = moving ? 'qbdrop' : 'qbready';   // ball up by his ear in the pocket
  else if (moving && a.plantAt != null && t - a.plantAt < a.plantDur) pose = mine ? 'plantc' : 'plant';   // planting to cut
  else if (back) pose = 'backpedal';
  else if (moving) pose = mine ? 'carry' : 'run';
  else pose = t < S.T0 ? a.idle : mine ? 'carry' : 'stand';
  if (moving && !SQUARE.has(pose)) {
    if (Math.abs(a.vy) > Math.abs(a.vx) * 1.4) view = a.vy > 0 ? 'front' : 'back';
    else { view = 'side'; face = a.vx > 0 ? 1 : -1; }
  } else if (!moving) view = 'side';
  if (SQUARE.has(pose) || (t < S.T0 && !moving)) face = a.homeFace;
  if (pose === 'spin') { const k = Math.min(3, Math.floor(((t - a.poseAt) / 0.4) * 4)); view = SPIN[k][0]; face = SPIN[k][1] * (a.vis?.face || 1); pose = 'carry'; }
  if (PREFER[pose]) view = PREFER[pose];
  const b = beat(a); let frame = 0;
  if (pose === 'run' || pose === 'carry') frame = Math.floor(t * (5 + speed * 0.9) + b.off * 4) & 3;
  else if (pose === 'backpedal' || pose === 'qbdrop') frame = Math.floor(t * 7 + b.off * 2) & 1;
  else if (['block', 'anchor', 'driven', 'drive', 'swim', 'rush', 'cheer', 'stumble'].includes(pose)) frame = Math.floor(t / b.per + b.off * 2) & 1;
  else if (pose === 'pump') frame = t - a.poseAt > 0.18 ? 1 : 0;
  else if (pose === 'hands' || pose === 'shoulder') frame = moving ? Math.floor(t * (4 + speed * 0.6) + b.off * 2) & 1 : 0;   // legs still running through the catch
  else if (pose === 'swat') frame = t - a.poseAt > 0.14 ? 1 : 0;
  else if (pose === 'breakdown' || pose === 'stutter') frame = Math.floor(t * 12 + b.off * 2) & 1;   // quick choppy feet
  else if (pose === 'plant' || pose === 'plantc') frame = a.plantFoot > 0 ? 1 : 0;   // cutting toward the camera plants the far foot
  else if (pose === 'throw') { const u = (t - a.poseAt) / 0.6; frame = u < 0.45 ? 0 : u < 0.7 ? 1 : 2; }
  else if (pose === 'kick' || pose === 'drop') frame = t - a.poseAt > (pose === 'kick' ? 0.15 : 0.5) ? 1 : 0;
  if (fallK >= 0) { face = a.fall.face; frame = Math.min(3, fallK); view = 'side'; }
  a.vis = { view, face };
  return { view, face, pose, frame };
}
