import React, { useMemo } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import AttendanceCard from './AttendanceCard.jsx';
import { useImage } from '../lib/useImage.js';
import { W, H } from '../lib/stadiumLayout.js';
import { stadiumLook } from '../lib/stadiumLooks.js';
import { pickAct } from '../lib/crowdActs.js';
import { makeCrowdShot } from '../lib/crowdShot.js';
import { makeFall, weatherKind } from '../lib/pixelSwarm.js';
import { shotPixels } from '../lib/screenPixels.js';

const seedOf = (id) => [...String(id)].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) >>> 0;

// Intro shot: the stadium. A sky cam rises from the top of the lower bowl to the upper deck of the home team's stadium while
// the crowd does one of its six things, with the network's attendance graphic on top.
// dress: the color every fan wears (the home team's alternate, when they turned that on). theme: that alternate's name.
// att: the game's crowd (count, pct, soldOut): empty seats show, upper deck first. act: force one crowd animation (the test tab uses this); otherwise the game picks one.
export default function IntroCrowd({ bc, home, stadium, weather, gameId = 0, dress = null, theme = '', act = null, att = null }) {
  const logo = useImage(home.logo), fall = weatherKind(weather?.sky);
  const look = stadiumLook(home, stadium, bc.prime), doing = act || pickAct(home, seedOf(gameId), look.night, dress);
  const scale = useMemo(() => Math.max(2, Math.min(5, Math.ceil(shotPixels() / W))), []);
  const fill = att?.pct ?? 1, make = () => makeCrowdShot({ team: home, look, act: doing, dress, theme, logo, stadiumName: stadium?.name, fill });
  return (
    <div className="intro-scene sc-crowd">
      <PixelCanvas className="crowd-px" w={W * scale} h={H * scale} make={make} deps={[home.id, logo, doing, dress, look.sky, fill]} />
      {fall && look.open && <PixelCanvas className="field-fall" make={(w, h) => makeFall(w, h, fall)} deps={[fall]} />}
      <AttendanceCard bc={bc} home={home} stadium={stadium} att={att} />
      <img className="field-bug" src={bc.net.logo} alt="" />
    </div>
  );
}
