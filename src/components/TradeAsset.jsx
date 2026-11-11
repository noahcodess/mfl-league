import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { getTeam, getTeamByCode } from '../data/teams.js';
import { capHitOf } from '../data/contracts.js';
import { money, ordinal } from '../lib/format.js';

// One thing in a trade: a player (pixel portrait in his team's jersey, position, name, stars, salary) or a draft pick (whose pick, season, round).
// big = the roomier look used for things already in the trade.
export default function TradeAsset({ item, tag, onClick, selected, locked, big }) {
  const cls = `tasset${selected ? ' on' : ''}${locked ? ' locked' : ''}${onClick ? ' click' : ''}${big ? ' big' : ''}`;
  if (item.position) {
    const team = getTeam(item.teamId) || { color: '#555', accent: '#ddd' };
    return (
      <button type="button" className={cls} onClick={onClick} disabled={locked} title={locked ? 'Untouchable' : ''}>
        <Headshot player={item} team={team} size={big ? 46 : 34} />
        <span className="tasset-pos">{item.position}</span>
        <span className="tasset-name">{item.name}{tag}<small>{item.age ? `Age ${item.age}` : ''}{item.number != null ? ` · #${item.number}` : ''}</small></span>
        <StarRating value={item.stars} />
        <span className="tasset-pay">{capHitOf(item) ? money(capHitOf(item)) : '-'}</span>
        {locked && <span title="Untouchable">🔒</span>}
        {selected && onClick && <span className="tasset-x" aria-hidden="true">×</span>}
      </button>
    );
  }
  const from = getTeamByCode(item.originalCode);
  return (
    <button type="button" className={`${cls} pick`} onClick={onClick}>
      <span className="tasset-pickart">{from ? <TeamBadge team={from} size={big ? 'md' : 'sm'} /> : '🎟️'}</span>
      <span className="tasset-pos">PICK</span>
      <span className="tasset-name">Season {item.season} · {ordinal(item.round)} round<small>{from ? `${from.name}'s pick` : ''}</small></span>
      {selected && onClick && <span className="tasset-x" aria-hidden="true">×</span>}
    </button>
  );
}
