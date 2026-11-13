import React from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { makeDrift, makeOrbit } from '../lib/pixelSwarm.js';

// Intro shot 1: the broadcast's logo punches in with pixels swirling around it, then the matchup line slides up under it.
export default function IntroOpen({ bc, game, home, away }) {
  return (
    <div className="intro-scene sc-open">
      <PixelCanvas className="sc-bg" make={(w, h) => makeDrift(w, h, bc.net.pixels, 110)} deps={[bc.net.key]} />
      <div className="open-rays" aria-hidden="true" />
      <div className="open-logo-wrap">
        <PixelCanvas className="open-orbit" w={180} h={180} make={(w, h) => makeOrbit(w, h, bc.net.pixels, 60)} deps={[bc.net.key]} />
        <img className="open-logo" src={bc.logo} alt={bc.title} />
      </div>
      <div className="open-sub"><span>Week {game.week}</span><b>{away.name} at {home.name}</b></div>
    </div>
  );
}
