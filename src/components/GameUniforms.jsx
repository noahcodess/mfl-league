import React from 'react';
import UniformSprite from './UniformSprite.jsx';
import { useJerseys, useGamePicks, gameUniforms } from '../data/jerseys.js';
import { getTeam, currentSeason } from '../data/teams.js';

// What both teams wear in a game: away on the left, home on the right (darker, unless the home team picked a light specialty uniform).
export default function GameUniforms({ game }) {
  const home = getTeam(game.home), away = getTeam(game.away);
  const hj = useJerseys(home), aj = useJerseys(away);
  const picks = useGamePicks(game.season ?? currentSeason());
  if (!home || !away || !hj.length || !aj.length) return null;
  const u = gameUniforms(hj, aj, picks.get(game.id));
  return (
    <div className={`game-uniforms${u.special ? ' special' : ''}`} title={u.special ? 'Specialty game' : 'Game day uniforms'}>
      <span><UniformSprite colors={u.away.colors} scale={2} /><small>{away.code} · {u.away.name}</small></span>
      <span><UniformSprite colors={u.home.colors} scale={2} /><small>{home.code} · {u.home.name}</small></span>
    </div>
  );
}
