import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';
import { RATING, networkFor, windowLabel } from '../data/games.js';

// One game's matchup line: away @ home with logos, the win-chance bar (each side's %), the matchup rating, a rivalry tag,
// and the network once a broadcast window is set.
export default function GameOdds({ game, compact }) {
  const home = getTeam(game.home);
  const away = getTeam(game.away);
  const hp = Math.round((game.odds?.home_win ?? 0.5) * 100);
  const r = RATING[game.odds?.rating] || RATING.okay;
  return (
    <div className={`godds${compact ? ' compact' : ''}`}>
      <span className="godds-team away">{away && <TeamBadge team={away} size="sm" />}<b>{compact ? away?.code : away?.name}</b><em>{100 - hp}%</em></span>
      <span className="godds-at">@</span>
      <span className="godds-team home"><em>{hp}%</em><b>{compact ? home?.code : home?.name}</b>{home && <TeamBadge team={home} size="sm" />}</span>
      <span className="godds-bar" style={{ '--away': away?.color || '#666', '--home': home?.color || '#999', '--p': `${100 - hp}%` }}><i /></span>
      <span className="godds-tags">
        <span className={`grating ${game.odds?.rating || 'okay'}`}>{r.icon} {r.label}</span>
        {game.rivalry && <span className="grival">⚔️ Rivalry</span>}
        {game.prime && <span className="gnet" title={windowLabel(game.prime)}>📺 {networkFor(game.prime, home)}</span>}
      </span>
    </div>
  );
}
