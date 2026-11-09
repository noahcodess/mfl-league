import React from 'react';
import { looksFor } from '../lib/portraitLooks.js';
import { portraitUrl } from '../lib/portraitDraw.js';

// A player's pixel portrait (no helmet) in his team jersey with his number. Same player, same look, every time.
export default function Headshot({ player, team, size = 64 }) {
  const t = team || { color: '#555555', accent: '#ffffff' };
  const src = portraitUrl(looksFor(player), t, player.number);
  return <img className="headshot" src={src} width={size} height={size} alt="" draggable="false" />;
}
