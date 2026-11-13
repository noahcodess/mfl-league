import React, { useEffect, useState } from 'react';
import GameField from './GameField.jsx';
import PixelCanvas from './PixelCanvas.jsx';
import { makeFall, weatherKind } from '../lib/pixelSwarm.js';
import { makeToss } from '../lib/tossDraw.js';
import { MIN_ZOOM, MAX_ZOOM } from '../lib/gameCamera.js';
import { yardX, MID_Y } from '../lib/fieldLayout.js';

const SHOT = { from: { x: yardX(50), y: MID_Y, zoom: MIN_ZOOM }, to: { x: yardX(50), y: MID_Y, zoom: MAX_ZOOM }, k: 0.018 };

// Intro shot: the camera zooms in on the coin toss at midfield (referee in the middle, a coach on each side) while the
// weather pops up, with the weather falling as pixels.
export default function IntroToss({ bc, home, away, stadium, weather, coaches }) {
  const [overlay, setOverlay] = useState(null);
  useEffect(() => { let live = true; makeToss(home, away, coaches).then((d) => live && setOverlay(() => d)); return () => { live = false; }; }, [home, away, coaches]);
  const fall = weatherKind(weather.sky);
  return (
    <div className="intro-scene sc-field">
      <GameField team={home} look={stadium || {}} shot={SHOT} overlay={overlay} />
      {fall && <PixelCanvas className="field-fall" make={(w, h) => makeFall(w, h, fall)} deps={[fall]} />}
      <img className="field-bug" src={bc.net.logo} alt="" />
      <div className="lower-third"><span className="lt-tag">Live</span><div><b>Coin toss</b><span>{away.name} call it in the air</span></div></div>
      <div className="wx-card">
        <span className="wx-icon">{weather.icon}</span>
        <div><b>{weather.temp}°</b><span>{weather.sky}</span><small>Wind {weather.wind} mph</small></div>
      </div>
    </div>
  );
}
