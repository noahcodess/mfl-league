import React from 'react';
import { uniformUrl } from '../lib/uniformDraw.js';
import { looksFor } from '../lib/portraitLooks.js';
import { helmetDesign } from '../data/drip.js';

// A player in full game uniform (helmet to cleats) with his drip and the team's helmet design, drawn crisp at `scale` times 32x56 pixels.
export default function UniformSprite({ colors, player, number, scale = 4, drip, team }) {
  const looks = looksFor(player || { id: 'uniform-model', nationality: 'USA' });
  const n = number ?? player?.number ?? 1;
  return <img className="uniform-sprite" src={uniformUrl(colors, looks, n, { drip, design: helmetDesign(team) })} alt="Uniform" width={32 * scale} height={56 * scale} />;
}
