// Decides how each player looks this frame: which way he faces (front, back or side, left or right) and which pose and
// frame he's in. It reads the live player (where he's moving and how fast, what he's doing), so the picture always matches
// the motion. Linemen and anyone squared up to an opponent keep facing their man however they get shoved.
const SIDE_ONLY = ['olset', 'dlset', 'qbset', 'rbset', 'wrset', 'cbset', 'lbset', 'qbready', 'qbdrop', 'throw', 'block', 'anchor', 'driven', 'drive', 'swim', 'rush',
  'reach', 'drop', 'cut', 'juke', 'stiff', 'kick', 'kneel', 'backpedal', 'tackle'];
const PREFER = { cheer: 'front', ...Object.fromEntries(SIDE_ONLY.map((k) => [k, 'side'])) };
const SQUARE = new Set(['olset', 'dlset', 'qbset', 'rbset', 'wrset', 'cbset', 'lbset', 'block', 'anchor', 'driven', 'drive', 'swim', 'rush', 'throw', 'kick', 'stiff', 'qbready', 'qbdrop', 'backpedal']);
const SPIN = [['side', 1], ['front', 1], ['side', -1], ['back', 1]];
const beat = (a) => { if (a.beat) return a.beat; let h = 7; for (const ch of String(a.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (a.beat = { per: 0.22 + (h % 7) * 0.035, off: (h % 97) / 97 }); };

// a: a live actor (sceneCore). holder: the actor with the ball, or null. Returns { view, face, pose, frame }.
export function lookAt(a, t, S, holder) {
  const speed = Math.hypot(a.vx, a.vy), moving = speed > 0.7, mine = holder === a, back = a.backUntil && t < a.backUntil && moving;
  let view = a.vis?.view || 'side', face = a.vis?.face || a.face, pose;
  if (a.down) pose = 'down';
  else if (a.pose === 'tackle') pose = 'dive';
  else if (a.celebrate || a.pose === 'cheer') pose = 'cheer';
  else if (a.pose === 'spin') pose = 'spin';
  else if (a.pose) pose = a.pose;
  else if (a.qb && mine && t > S.T0 + 0.15) pose = moving ? 'qbdrop' : 'qbready';   // ball up by his ear in the pocket
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
  if (pose === 'catch' && !moving) view = 'front';
  const b = beat(a); let frame = 0;
  if (pose === 'run' || pose === 'carry') frame = Math.floor(t * (5 + speed * 0.9) + b.off * 4) & 3;
  else if (pose === 'backpedal' || pose === 'qbdrop') frame = Math.floor(t * 7 + b.off * 2) & 1;
  else if (['block', 'anchor', 'driven', 'drive', 'swim', 'rush', 'cheer'].includes(pose)) frame = Math.floor(t / b.per + b.off * 2) & 1;
  else if (pose === 'throw') { const u = (t - a.poseAt) / 0.6; frame = u < 0.45 ? 0 : u < 0.7 ? 1 : 2; }
  else if (pose === 'kick' || pose === 'drop') frame = t - a.poseAt > (pose === 'kick' ? 0.15 : 0.5) ? 1 : 0;
  a.vis = { view, face };
  return { view, face, pose, frame };
}
