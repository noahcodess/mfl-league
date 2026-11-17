import React from 'react';
import Headshot from './Headshot.jsx';

// A player's stat card that takes over his team's spot in the scorebug for a few seconds between plays: the team box wipes
// into a gradient in his team's colors with his headshot, his name in the program's font and two lines of his game so far.
// It wipes back to the score before the snap (out = wiping back). Each network's bug styles it its own way (scorebugCard.css).
export default function ScorebugCard({ card }) {
  const { player, team, lines, out, side } = card;
  const first = (player.name || '').split(' ')[0] || '', last = player.last || (player.name || '').split(' ').slice(1).join(' ') || player.name;
  return (
    <div className={`sbc ${side}${out ? ' out' : ''}`} style={{ '--tc': team.color, '--ta': team.accent }}>
      <span className="sbc-face"><Headshot player={player} team={team} size={64} /></span>
      <span className="sbc-txt">
        <b>{first ? `${first[0]}. ` : ''}{last}</b>
        <small>{lines[0]}</small>
        <small>{lines[1]}</small>
      </span>
    </div>
  );
}
