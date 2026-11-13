import React from 'react';
import UniformSprite from './UniformSprite.jsx';
import { usePlayerDrip } from '../data/drip.js';

// A player's pixel art in his game-day uniform and his own drip, for broadcast graphics.
export default function IntroSprite({ player, kit, team, scale = 3 }) {
  const drip = usePlayerDrip(player.id);
  if (!kit) return null;
  return <UniformSprite colors={kit.colors} player={player} scale={scale} drip={drip} team={team} />;
}
