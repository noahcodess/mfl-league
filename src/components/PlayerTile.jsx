import React from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { isRetiring } from '../data/players.js';

// One roster spot: headshot, number, name, stars and age. Insiders (own team, commissioner, owner) also see
// contract years left and potential. Click it for the full player card.
export default function PlayerTile({ player, team, index, onOpen, insider }) {
  const pot = insider ? insider[player.id] : null;
  const years = player.contract?.years;
  return (
    <button className={`ptile ${player.depth}`} style={{ '--i': Math.min(index, 40) }} onClick={() => onOpen(player)}>
      <Headshot player={player} team={team} size={64} />
      <span className="ptile-body">
        <span className="ptile-top">
          <span className="ptile-num">#{player.number ?? '-'}</span>
          <span className="ptile-name">{player.name}</span>
          {isRetiring(player) && <span className="ret-tag" title="Ages out this offseason (max age 27)">RET</span>}
        </span>
        <span className="ptile-bottom">
          <span className="ptile-pos">{player.depth === 'backup' ? 'Backup' : 'Starter'}</span>
          <StarRating value={player.stars} elite={player.elite} />
          <span className="ptile-age">{player.age ? `Age ${player.age}` : ''}</span>
        </span>
        {insider && (
          <span className="ptile-insider">
            {years != null && <span className={`yrs${years === 1 ? ' last' : ''}`}>{years === 1 ? 'Final year' : `${years} yrs left`}</span>}
            {pot != null && <span className="pot-mini">POT <StarRating value={pot} elite={pot === 5} /></span>}
          </span>
        )}
      </span>
    </button>
  );
}
