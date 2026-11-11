import React from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';

// One roster spot: headshot, number, name, stars and age. Insiders (own team, commissioner, owner) also see
// potential. Free agents and draft prospects show their position instead of a depth spot. No status badges here:
// contract, rookie and retirement notes live inside the player card. Click for the full card.
export default function PlayerTile({ player, team, index, onOpen, insider, badge }) {
  const pot = insider ? insider[player.id] : null;
  const fa = player.status === 'free_agent' || player.status === 'prospect';
  return (
    <button className={`ptile ${fa ? 'fa' : player.depth}`} style={{ '--i': Math.min(index, 40) }} onClick={() => onOpen(player)}>
      <Headshot player={player} team={team} size={64} />
      <span className="ptile-body">
        <span className="ptile-top">
          {fa ? <span className="ptile-num">{player.position}</span> : <span className="ptile-num">#{player.number ?? '-'}</span>}
          <span className="ptile-name">{player.name}</span>
        </span>
        <span className="ptile-bottom">
          <span className="ptile-pos">{player.status === 'prospect' ? player.college : fa ? 'Free agent' : player.depth === 'backup' ? 'Backup' : 'Starter'}</span>
          <StarRating value={player.stars} elite={player.elite} peak={player.peakStars} />
          <span className="ptile-age">{player.age ? `Age ${player.age}` : ''}</span>
        </span>
        {(pot != null || badge) && (
          <span className="ptile-insider">
            {pot != null && <span className="pot-mini">POT <StarRating value={pot} elite={pot === 5} /></span>}
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}
