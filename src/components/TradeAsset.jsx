import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import StarRating from './StarRating.jsx';
import { getTeamByCode } from '../data/teams.js';
import { capHitOf } from '../data/contracts.js';
import { money, ordinal } from '../lib/format.js';

// One thing in a trade: a player (position, name, stars, salary) or a draft pick (whose pick, season, round).
export default function TradeAsset({ item, tag, onClick, selected, locked }) {
  const cls = `tasset${selected ? ' on' : ''}${locked ? ' locked' : ''}${onClick ? ' click' : ''}`;
  if (item.position) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={locked} title={locked ? 'Untouchable' : ''}>
        <span className="tasset-pos">{item.position}</span>
        <span className="tasset-name">{item.name}{tag}</span>
        <StarRating value={item.stars} />
        <span className="tasset-pay">{capHitOf(item) ? money(capHitOf(item)) : '-'}</span>
        {locked && <span title="Untouchable">🔒</span>}
      </button>
    );
  }
  const from = getTeamByCode(item.originalCode);
  return (
    <button type="button" className={cls} onClick={onClick}>
      <span className="tasset-pos">PICK</span>
      {from && <TeamBadge team={from} size="xs" />}
      <span className="tasset-name">Season {item.season} · {ordinal(item.round)} round{from ? ` (${from.code})` : ''}</span>
    </button>
  );
}
