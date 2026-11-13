import React, { useEffect } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { makeSting, STING_MS } from '../lib/pixelSwarm.js';

// The network transition (under a second): pixel tiles in the network's colors ripple out until they cover the screen while
// its logo punches in, then ripple away. Plays between intro shots and later before replays. Covers the screen at the halfway mark.
export default function NetStinger({ net, onDone }) {
  useEffect(() => { const t = setTimeout(() => onDone?.(), STING_MS); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`net-sting sting-${net.key}`}>
      <PixelCanvas make={(w, h) => makeSting(w, h, net.pixels)} deps={[net.key]} />
      <img src={net.logo} alt="" className="net-sting-logo" />
    </div>
  );
}
