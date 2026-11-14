// Decides how each player looks at one moment: which way he faces (front, back or side, left or right) and which pose
// and frame he's in. Facing follows where he's moving, except on a backpedal; a spin move turns him all the way around.
const PREFER = { cheer: 'front', set: 'side', block: 'side', throw: 'side', kick: 'side', stiff: 'side', juke: 'side', kneel: 'side', backpedal: 'side' };
const SPIN = [['side', 1], ['front', 1], ['side', -1], ['back', 1]];

// a: the actor. p: posAt(a, t). S: the scene. Returns { view, face, pose, frame } and remembers his facing on a.vis.
export function lookAt(a, p, t, S) {
  const down = a.down != null && t >= a.down && !(a.upAt && t >= a.upAt);
  const set = a.poses.find((q) => t >= q.t0 && t < q.t1), last = a.vis || { view: 'side', face: a.face };
  let view = last.view, face = last.face;
  const back = a.back?.some(([t0, t1]) => t >= t0 && t < t1);
  if (p.moving && !back) {
    if (Math.abs(p.dy) > Math.abs(p.dx) * 1.4) view = p.dy > 0 ? 'front' : 'back';
    else { view = 'side'; face = p.dx > 0 ? 1 : -1; }
  } else if (!p.moving) { view = 'side'; if (t < S.T0 || !a.vis) face = a.face; }
  if (back) { view = 'side'; face = a.face; }
  let pose;
  if (down) pose = 'down';
  else if (a.down != null && t >= a.down - 0.22) pose = 'dive';
  else if (a.upAt && t >= a.upAt - 0.4 && t < a.upAt) pose = 'kneel';
  else if (set) pose = set.pose;
  else if (back && p.moving) pose = 'backpedal';
  else if (p.moving) pose = 'run';
  else pose = t < S.T0 ? a.idle : 'stand';
  if (pose === 'spin') { const s = SPIN[Math.min(3, Math.floor(((t - set.t0) / (set.t1 - set.t0)) * 4))]; view = s[0]; face = s[1] * (a.vis?.face || 1); pose = 'run'; }
  if (['block', 'set', 'throw', 'kick', 'stiff'].includes(pose)) face = a.face;   // squared up to his man (or downfield), however he gets shoved
  if (PREFER[pose]) view = PREFER[pose];
  if (pose === 'catch' && !p.moving) view = 'front';
  let frame = 0;
  if (pose === 'run' || pose === 'backpedal') frame = Math.floor(t * (6 + p.speed * 1.1) + a.keys[0].y * 3) & 3;
  else if (pose === 'cheer' || pose === 'block') frame = Math.floor(t * 4 + a.keys[0].y) & 1;
  else if (pose === 'throw' || pose === 'kick') frame = set && t > set.t0 + (set.t1 - set.t0) * 0.45 ? 1 : 0;
  a.vis = { view, face };
  return { view, face, pose, frame };
}
