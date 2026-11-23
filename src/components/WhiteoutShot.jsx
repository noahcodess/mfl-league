// The whiteout cutscene's stadium shot: a still of the Creepers' house all in white, towels going, the camera shaking with
// the noise (harder than the meter's own shake), the Stadium Pulse up and the scorebug staying on top.
import React, { useMemo } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import StadiumPulse from './StadiumPulse.jsx';
import { useImage } from '../lib/useImage.js';
import { useStadiums } from '../data/stadiums.js';
import { W, H } from '../lib/stadiumLayout.js';
import { stadiumLook } from '../lib/stadiumLooks.js';
import { makeCrowdShot } from '../lib/crowdShot.js';
import { shotPixels } from '../lib/screenPixels.js';
import { WHITEOUT_NAME } from '../lib/whiteoutPlan.js';

// home: the Creepers. bc: the broadcast. v: the play's Stadium Pulse. fill: how full (0-1). out: on its way off.
export default function WhiteoutShot({ home, bc, v, fill = 1, out = false }) {
  const logo = useImage(home.logo), stadium = useStadiums()[home.id], look = stadiumLook(home, stadium, bc.prime);
  const scale = useMemo(() => Math.max(2, Math.min(5, Math.ceil(shotPixels() / W))), []);
  const make = () => makeCrowdShot({ team: home, look, act: 'towels', dress: '#ffffff', theme: WHITEOUT_NAME, logo, stadiumName: stadium?.name, fill, ms: 1 });   // ms 1: a still, no climb
  const lvl = Math.max(v, 70);
  return (
    <>
      <div className={`wo-shot${out ? ' out' : ''}`} style={{ '--amp': ((lvl - 40) / 60).toFixed(2) }}>
        <PixelCanvas className="crowd-px" w={W * scale} h={H * scale} make={make} deps={[home.id, logo, look.sky, fill]} />
        <span className="wo-tag">❄️ {WHITEOUT_NAME.toUpperCase()}</span>
      </div>
      <StadiumPulse v={lvl} net={bc.net.key} out={out} />
    </>
  );
}
