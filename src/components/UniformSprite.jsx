import React from 'react';
import { uniformUrl } from '../lib/uniformDraw.js';
import { looksFor } from '../lib/portraitLooks.js';

// A player in full game uniform (helmet to cleats), drawn crisp at `scale` times its 32x56 pixel size.
export default function UniformSprite({ colors, player, number, scale = 4 }) {
  const looks = looksFor(player || { id: 'uniform-model', nationality: 'USA' });
  const n = number ?? player?.number ?? 1;
  return <img className="uniform-sprite" src={uniformUrl(colors, looks, n)} alt="Uniform" width={32 * scale} height={56 * scale} />;
}
