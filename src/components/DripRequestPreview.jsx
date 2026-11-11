import React from 'react';
import UniformSprite from './UniformSprite.jsx';
import { useJerseys } from '../data/jerseys.js';
import { getAllPlayers } from '../data/players.js';
import { getTeam } from '../data/teams.js';

// Inbox: a drip change request shown as the player before and after, side by side, in his Home uniform.
export default function DripRequestPreview({ data }) {
  const team = getTeam(data.team);
  const jerseys = useJerseys(team);
  const player = getAllPlayers().find((p) => p.id === data.player);
  if (!team || !jerseys.length) return null;
  const colors = jerseys[0].colors;
  return (
    <span className="drip-ba">
      <span><UniformSprite colors={colors} player={player} team={team} drip={data.before?.drip} number={data.before?.number} scale={2} /><small>Before</small></span>
      <b>→</b>
      <span><UniformSprite colors={colors} player={player} team={team} drip={data.after?.drip} number={data.after?.number} scale={2} /><small>After</small></span>
    </span>
  );
}
