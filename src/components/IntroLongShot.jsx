import React from 'react';
import GameField from './GameField.jsx';
import PixelCanvas from './PixelCanvas.jsx';
import Scorebug from './Scorebug.jsx';
import { makeFall, weatherKind } from '../lib/pixelSwarm.js';
import { MIN_ZOOM } from '../lib/gameCamera.js';
import { yardX, MID_Y } from '../lib/fieldLayout.js';

const SHOT = { from: { x: yardX(38), y: MID_Y, zoom: MIN_ZOOM }, to: { x: yardX(62), y: MID_Y, zoom: MIN_ZOOM * 1.05 }, k: 0.006 };

// Last intro shot, after the program's transition: a long shot of the field drifting across, the weather popping up (and
// falling as pixels), who receives the opening kick and which way they go, then the scorebug slides in. Kickoff comes later.
export default function IntroLongShot({ bc, home, away, stadium, weather, kick, st, rec }) {
  const fall = weatherKind(weather.sky), recv = kick?.receiving === home.id ? home : away;
  const recvDir = kick ? ((recv.id === home.id) === (kick.home_dir === 'right') ? 'right' : 'left') : null;
  return (
    <div className="intro-scene sc-field">
      <GameField team={home} look={stadium || {}} shot={SHOT} />
      {fall && <PixelCanvas className="field-fall" make={(w, h) => makeFall(w, h, fall)} deps={[fall]} />}
      <img className="field-bug" src={bc.net.logo} alt="" />
      {kick && (
        <div className="lower-third lt-kick">
          <span className="lt-tag">Kickoff</span>
          <div><b>{recv.name} receive</b><span>{recvDir === 'right' ? 'Going left to right →' : '← Going right to left'}</span></div>
        </div>
      )}
      <div className="wx-card">
        <span className="wx-icon">{weather.icon}</span>
        <div><b>{weather.temp}°</b><span>{weather.sky}</span><small>Wind {weather.wind} mph</small></div>
      </div>
      <div className="intro-bug"><Scorebug bc={bc} home={home} away={away} st={st} rec={rec} /></div>
    </div>
  );
}
