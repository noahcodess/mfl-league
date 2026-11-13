import React, { useEffect, useState } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { makeCrowd } from '../lib/pixelSwarm.js';

// Intro shot: the crowd gets its own screen. A pixel crowd in the home colors doing the wave, the stadium name, and the
// attendance counting up to a sellout (bad teams will draw less later).
export default function IntroCrowd({ bc, home, stadium }) {
  const cap = stadium?.capacity || 60000;
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; const t0 = performance.now() + 500;
    const step = (now) => { const k = Math.max(0, Math.min(1, (now - t0) / 1600)); setN(Math.round(cap * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cap]);
  return (
    <div className="intro-scene sc-crowd" style={{ '--tc': home.color, '--ta': home.accent }}>
      <div className="crowd-lights" aria-hidden="true"><i /><i /><i /><i /></div>
      <PixelCanvas className="crowd-px" w={320} h={180} make={(w, h) => makeCrowd(w, h, [home.color, home.accent, '#ffffff', home.color])} deps={[home.id]} />
      <div className="crowd-card">
        <img src={home.logo} alt="" />
        <div>
          <small>Today at</small>
          <b className="crowd-name">{stadium?.name || home.name}</b>
          <span className="crowd-count">{n.toLocaleString()}</span>
          <small>in attendance</small>
        </div>
        {n >= cap && <span className="crowd-stamp">Sold out</span>}
      </div>
      <img className="field-bug" src={bc.net.logo} alt="" />
    </div>
  );
}
