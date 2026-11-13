import React from 'react';
import GameField from './GameField.jsx';
import PixelCanvas from './PixelCanvas.jsx';
import { makeFall, weatherKind } from '../lib/pixelSwarm.js';
import { MIN_ZOOM } from '../lib/gameCamera.js';
import { yardX, MID_Y } from '../lib/fieldLayout.js';

const SHOT = { from: { x: yardX(22), y: MID_Y, zoom: MIN_ZOOM }, to: { x: yardX(50), y: MID_Y, zoom: 0.95 }, k: 0.012 };

// Intro shot 4: the camera slowly pushes in on today's field, the crowd count comes up (a sellout for now), then the weather,
// with the weather falling as pixels over the shot. The network's bug sits in the corner.
export default function IntroField({ bc, home, stadium, weather }) {
  const fall = weatherKind(weather.sky);
  return (
    <div className="intro-scene sc-field">
      <GameField team={home} look={stadium || {}} shot={SHOT} />
      {fall && <PixelCanvas className="field-fall" make={(w, h) => makeFall(w, h, fall)} deps={[fall]} />}
      <img className="field-bug" src={bc.net.logo} alt="" />
      <div className="lower-third">
        <span className="lt-tag">Live</span>
        <div><b>{stadium?.name || home.name}</b><span>Attendance {(stadium?.capacity || 0).toLocaleString()} · Sold out</span></div>
      </div>
      <div className="wx-card">
        <span className="wx-icon">{weather.icon}</span>
        <div><b>{weather.temp}°</b><span>{weather.sky}</span><small>Wind {weather.wind} mph</small></div>
      </div>
    </div>
  );
}
