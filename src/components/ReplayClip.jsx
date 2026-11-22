// A replay of an earlier play inside a break: its own little field, the play acted out in slow motion from the snap to the
// whistle, then it holds a beat and runs again. clip: from clipFor. team: the home team (whose field it is). looks: the sprites.
import React, { useMemo, useRef } from 'react';
import GameField from './GameField.jsx';
import { seek } from '../lib/sceneBuild.js';
import { drawScene } from '../lib/sceneDraw.js';
import { camTarget } from '../lib/broadcastCam.js';

export default function ReplayClip({ clip, team, looks }) {
  const st = useRef({ rt: clip.rp.from, last: 0, cur: clip.S, hold: 0 });
  const live = useMemo(() => ({
    target: () => camTarget(clip.S, st.current.cur, { phase: 'replay', t: st.current.rt, replay: clip.rp }),
    draw(ctx, cam) {
      const c = st.current, now = performance.now(), dt = c.last ? Math.min(0.1, (now - c.last) / 1000) : 0; c.last = now;
      if (c.rt < clip.rp.to) c.rt = Math.min(clip.rp.to, c.rt + dt * clip.rp.speed);
      else if ((c.hold += dt) > 1.1) { c.rt = clip.rp.from; c.hold = 0; c.cur = clip.S; }   // hold on the finish, then run it back
      c.cur = seek(c.cur, c.rt);
      drawScene(ctx, c.cur, cam, looks);
    },
  }), [clip, looks]);
  return <div className="rclip"><GameField team={team} live={live} /><b className="rclip-tag">REPLAY</b></div>;
}
