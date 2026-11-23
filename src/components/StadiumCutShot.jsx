// A stadium cutscene's shot: a tight still of the home crowd all dressed in the uniform's color, the camera shaking hard
// with the noise and pushing in slowly, the Stadium Pulse up and the scorebug staying on top. The Creepers whiteout has
// every fan whirling a white towel in circles; a Bloodbath game has the whole house jumping.
import React, { useMemo } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import StadiumPulse from './StadiumPulse.jsx';
import { useImage } from '../lib/useImage.js';
import { useStadiums } from '../data/stadiums.js';
import { W, H } from '../lib/stadiumLayout.js';
import { stadiumLook } from '../lib/stadiumLooks.js';
import { makeCrowdShot } from '../lib/crowdShot.js';
import { shotPixels } from '../lib/screenPixels.js';

const KINDS = { wo: { act: 'whirl', theme: 'Whiteout' }, bb: { act: 'jump', theme: 'Bloodbath' } };

// kind: 'wo' | 'bb'. home: the home team. bc: the broadcast. v: the Stadium Pulse to show. fill: how full (0-1). dress: the fans' color.
export default function StadiumCutShot({ kind = 'wo', home, bc, v, fill = 1, dress = '#ffffff' }) {
  const logo = useImage(home.logo), stadium = useStadiums()[home.id], look = stadiumLook(home, stadium, bc.prime), k = KINDS[kind] || KINDS.wo;
  const scale = useMemo(() => Math.max(2, Math.min(5, Math.ceil(shotPixels() / W))), []);
  const make = () => makeCrowdShot({ team: home, look, act: k.act, dress, theme: k.theme, logo, stadiumName: stadium?.name, fill, ms: 1e9 });   // a huge climb time: it holds at the bottom, on the lower bowl
  return (
    <>
      <div className="wo-shot" style={{ '--amp': ((v - 40) / 60).toFixed(2) }}>
        <div className="wo-push"><PixelCanvas className="crowd-px" w={W * scale} h={H * scale} make={make} deps={[home.id, logo, look.sky, fill, kind, dress]} /></div>
      </div>
      <StadiumPulse v={v} net={bc.net.key} />
    </>
  );
}
