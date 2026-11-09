import React from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';

// One roster spot: headshot, number, name, position, stars and age. Click it for the full player card.
export default function PlayerTile({ player, team, index, onOpen }) {
  return (
    <button className={`ptile ${player.depth}`} style={{ '--i': Math.min(index, 40) }} onClick={() => onOpen(player)}>
      <Headshot player={player} team={team} size={46} />
      <span className="ptile-body">
        <span className="ptile-top">
          <span className="ptile-num">#{player.number ?? '-'}</span>
          <span className="ptile-name">{player.name}</span>
        </span>
        <span className="ptile-bottom">
          <span className="ptile-pos">{player.position}{player.depth === 'backup' && <small> 2nd</small>}</span>
          <StarRating value={player.stars} elite={player.elite} />
          <span className="ptile-age">{player.age ? `Age ${player.age}` : ''}</span>
        </span>
      </span>
    </button>
  );
}
