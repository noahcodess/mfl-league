import React from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { isRetiring } from '../data/players.js';
import { contractLabel, yearsLeft } from '../data/contracts.js';
import { currentSeason } from '../data/teams.js';

// One roster spot: headshot, number, name, stars and age. Insiders (own team, commissioner, owner) also see
// contract years left and potential. Free agents and draft prospects show their position instead of a depth spot.
// Rookies get a badge. Click for the full card.
export default function PlayerTile({ player, team, index, onOpen, insider, badge }) {
  const pot = insider ? insider[player.id] : null;
  const left = yearsLeft(player);
  const fa = player.status === 'free_agent' || player.status === 'prospect';
  const rookie = player.rookieSeason != null && player.rookieSeason === currentSeason();
  return (
    <button className={`ptile ${fa ? 'fa' : player.depth}`} style={{ '--i': Math.min(index, 40) }} onClick={() => onOpen(player)}>
      <Headshot player={player} team={team} size={64} />
      <span className="ptile-body">
        <span className="ptile-top">
          {fa ? <span className="ptile-num">{player.position}</span> : <span className="ptile-num">#{player.number ?? '-'}</span>}
          <span className="ptile-name">{player.name}</span>
          {rookie && <span className="rookie-tag" title="First season in the league">ROOKIE</span>}
          {isRetiring(player) && <span className="ret-tag" title="Ages out this offseason (max age 27)">RET</span>}
        </span>
        <span className="ptile-bottom">
          <span className="ptile-pos">{player.status === 'prospect' ? player.college : fa ? 'Free agent' : player.depth === 'backup' ? 'Backup' : 'Starter'}</span>
          <StarRating value={player.stars} elite={player.elite} />
          <span className="ptile-age">{player.age ? `Age ${player.age}` : ''}</span>
        </span>
        {(insider || badge) && (
          <span className="ptile-insider">
            {insider && !fa && <span className={`yrs${left === 0 ? ' gone' : left === 1 ? ' last' : ''}`}>{contractLabel(player)}</span>}
            {pot != null && <span className="pot-mini">POT <StarRating value={pot} elite={pot === 5} /></span>}
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}
