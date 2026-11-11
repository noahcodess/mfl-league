import React from 'react';
import UniformSprite from './UniformSprite.jsx';
import { useJerseys, gameUniforms } from '../data/jerseys.js';
import { getTeam } from '../data/teams.js';

// What both teams wear in a game: away on the left, home (always the darker uniform) on the right.
export default function GameUniforms({ game }) {
  const home = getTeam(game.home), away = getTeam(game.away);
  const hj = useJerseys(home), aj = useJerseys(away);
  if (!home || !away || !hj.length || !aj.length) return null;
  const u = gameUniforms(hj, aj);
  return (
    <div className="game-uniforms" title="Game day uniforms">
      <span><UniformSprite colors={u.away.colors} scale={2} /><small>{away.code} · {u.away.name}</small></span>
      <span><UniformSprite colors={u.home.colors} scale={2} /><small>{home.code} · {u.home.name}</small></span>
    </div>
  );
}
