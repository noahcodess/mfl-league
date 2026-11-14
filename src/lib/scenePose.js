// Decides how each player looks at one moment: which way he faces (front, back or side, left or right) and which pose
// and frame he's in. Facing follows where he's moving, except on a backpedal; a spin move turns him all the way around.
const SIDE_ONLY = ['olset', 'dlset', 'qbset', 'rbset', 'wrset', 'cbset', 'lbset', 'qbready', 'qbdrop', 'throw', 'block', 'anchor', 'driven', 'drive', 'swim', 'rush',
  'reach', 'drop', 'cut', 'juke', 'stiff', 'kick', 'kneel', 'backpedal', 'tackle'];
const PREFER = { cheer: 'front', ...Object.fromEntries(SIDE_ONLY.map((k) => [k, 'side'])) };
const SQUARE = new Set(['olset', 'dlset', 'qbset', 'rbset', 'wrset', 'cbset', 'lbset', 'block', 'anchor', 'driven', 'drive', 'swim', 'rush', 'throw', 'kick', 'stiff', 'qbready', 'qbdrop', 'cut']);
// Every player keeps his own rhythm so nobody moves in sync: a beat length and a starting point from his id.
const beat = (a) => { let h = 7; for (const ch of String(a.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return { per: 0.22 + (h % 7) * 0.035, off: (h % 97) / 97 }; };
const SPIN = [['side', 1], ['front', 1], ['side', -1], ['back', 1]];

// a: the actor. p: posAt(a, t). S: the scene. holder: who has the ball right now. Returns { view, face, pose, frame } and
// remembers his facing on a.vis.
export function lookAt(a, p, t, S, holder) {
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
  else if (a.qb && holder === a.id && t > S.T0 + 0.15) pose = p.moving ? 'qbdrop' : 'qbready';   // ball up by his ear, in the pocket
  else if (back && p.moving) pose = 'backpedal';
  else if (p.moving) pose = holder === a.id ? 'carry' : 'run';
  else pose = t < S.T0 ? a.idle : holder === a.id ? 'carry' : 'stand';
  if (pose === 'spin') { const s = SPIN[Math.min(3, Math.floor(((t - set.t0) / (set.t1 - set.t0)) * 4))]; view = s[0]; face = s[1] * (a.vis?.face || 1); pose = 'run'; }
  if (SQUARE.has(pose)) face = a.face;   // squared up to his man (or downfield), however he gets shoved
  if (PREFER[pose]) view = PREFER[pose];
  if (pose === 'catch' && !p.moving) view = 'front';
  let frame = 0; const b = beat(a);
  if (pose === 'run' || pose === 'carry') frame = Math.floor(t * (5 + p.speed * 0.9) + b.off * 4) & 3;
  else if (pose === 'backpedal' || pose === 'qbdrop') frame = Math.floor(t * 7 + b.off * 2) & 1;
  else if (['block', 'anchor', 'driven', 'drive', 'swim', 'rush', 'cheer'].includes(pose)) frame = Math.floor(t / b.per + b.off * 2) & 1;
  else if (pose === 'throw') { const u = set ? (t - set.t0) / (set.t1 - set.t0) : 0; frame = u < 0.45 ? 0 : u < 0.7 ? 1 : 2; }
  else if (pose === 'kick' || pose === 'drop') frame = set && t > set.t0 + (set.t1 - set.t0) * 0.4 ? 1 : 0;
  a.vis = { view, face };
  return { view, face, pose, frame };
}
