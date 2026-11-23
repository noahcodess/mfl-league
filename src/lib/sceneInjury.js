// A player getting hurt on the field, from the engine's 'injury' event: he goes down where it happens and stays down in
// one of the five hurt poses (hurtPoses), breathing hard, while the play goes on around him. A man in the middle of the
// play (the ball carrier, his tackler, the QB, a receiver who's thrown to) goes down at the end of it, after the hit;
// anyone else can pull up mid-play. After the whistle everyone around him backs off to give him room, and most of his
// teammates take a knee. Never touches the result.
import { ev } from './sceneLineup.js';
import { B, dist } from './sceneCore.js';
import { hurtPose } from './hurtPoses.js';

export function stageInjury(S) {
  const e = ev(S.play, 'injury')[0];
  if (!e) return;
  const busy = new Set((S.play.events || []).flatMap((x) => [x.carrier, x.def, x.by, x.target, x.qb, x.returner, x.kicker].filter(Boolean)));
  const a0 = S.by[e.id], end = S.tSack ?? S.tEnd ?? S.T0 + 2;
  const at = busy.has(e.id) || a0?.qb ? Math.max(S.T0, end - 0.05) : S.T0 + 0.5 + S.rand() * Math.max(0.2, (S.tEnd ?? S.T0 + 2) - S.T0 - 0.9);
  S.injury = { id: e.id, at, part: e.part };
  S.when(at, (s) => {
    const a = s.by[e.id]; if (!a) return;
    const face = a.fall?.face || a.vis?.face || a.face || 1, pose = hurtPose(e.part);
    a.hurt = { pose, at: s.t, face };
    if (!a.down) { a.down = true; a.fall = { t0: s.t, dur: 0.45, back: pose !== 'hurtHam', face }; }   // he crumples
    a.brain = null; a.pose = null;   // the ball carrier is always "busy": he goes down with it, never before
  });
  S.when(Math.max(at, S.tEnd ?? at) + 1.7, (s) => {   // give him room
    const h = s.by[e.id]; if (!h) return;
    for (const a of s.actors) {
      if (a === h || a.hurt || dist(a.x, a.y, h.x, h.y) > 7) continue;
      const ang = Math.atan2(a.y - h.y, a.x - h.x) || s.rand() * 6.28, r = 4.5 + s.rand() * 2.2;
      a.down = false; a.pose = null; a.brain = B.to(h.x + Math.cos(ang) * r, h.y + Math.sin(ang) * r, 2.4);
      if (a.side === h.side && s.rand() < 0.65) s.when(s.t + 1.5 + s.rand() * 0.6, () => s.setPose(a, 'kneel'));
    }
  });
}
