import React, { useEffect } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { makeSting, STING_MS } from '../lib/pixelSwarm.js';

// The network transition (under a second): pixel tiles in the network's colors ripple out until they cover the screen while
// its logo punches in, then ripple away. Plays between intro shots and later before replays. Covers the screen at the halfway mark.
// The Craft Bowl's (net.gold) runs in gold: gold tiles, a light sweep across the logo and a few sparkles.
export default function NetStinger({ net, onDone }) {
  useEffect(() => { const t = setTimeout(() => onDone?.(), STING_MS); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`net-sting sting-${net.key}${net.gold ? ' sting-gold' : ''}`}>
      <PixelCanvas make={(w, h) => makeSting(w, h, net.pixels)} deps={[net.key]} />
      <img src={net.logo} alt="" className="net-sting-logo" />
      {net.gold && <><i className="sting-sweep" /><i className="sting-spark a" /><i className="sting-spark b" /><i className="sting-spark c" /></>}
    </div>
  );
}
