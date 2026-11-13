import React, { useEffect, useState } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import IntroSprite from './IntroSprite.jsx';
import { makeDrift, makeOrbit } from '../lib/pixelSwarm.js';

function CountUp({ value, delay }) {
  const num = typeof value === 'number' ? value : null;
  const [n, setN] = useState(num === null ? value : 0);
  useEffect(() => {
    if (num === null) return undefined;
    let raf; const t0 = performance.now() + delay;
    const step = (now) => { const k = Math.max(0, Math.min(1, (now - t0) / 900)); setN(Math.round(num * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [num, delay]);
  return <b>{n}</b>;
}

// Intro shot 3: the player to watch, big in his uniform with pixels circling him, and his numbers counting up.
export default function IntroPlayer({ bc, spot, team, kit }) {
  const p = spot.player;
  return (
    <div className="intro-scene sc-player" style={{ '--tc': team.color, '--ta': team.accent }}>
      <PixelCanvas className="sc-bg" make={(w, h) => makeDrift(w, h, [team.color, team.accent, ...bc.net.pixels.slice(0, 2)], 90, 21)} deps={[team.id]} />
      <div className="pl-head"><span>{spot.label}</span><small>{spot.note}</small></div>
      <div className="pl-sprite">
        <PixelCanvas className="pl-orbit" w={160} h={200} make={(w, h) => makeOrbit(w, h, [team.accent, '#ffffff', team.color], 50, 8)} deps={[team.id]} />
        <IntroSprite player={p} kit={kit} team={team} scale={7} />
      </div>
      <div className="pl-info">
        <div className="pl-name"><img src={team.logo} alt="" /><div><b>{p.name}</b><span>#{p.number} · {p.position} · {team.name}</span></div></div>
        <div className="pl-tiles">
          {spot.tiles.map(([label, v], i) => <div key={label} className="pl-tile" style={{ '--i': i }}><CountUp value={v} delay={700 + i * 220} /><small>{label}</small></div>)}
        </div>
      </div>
    </div>
  );
}
