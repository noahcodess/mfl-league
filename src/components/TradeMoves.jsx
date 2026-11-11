import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';
import { shortDate } from '../lib/format.js';

// A player's trades, newest first: date, from-team → to-team, and what he was traded for.
export default function TradeMoves({ moves }) {
  if (!moves?.length) return null;
  return (
    <div className="career-trades">
      <h4>🔁 Trades <span className="count">{moves.length}</span></h4>
      <ol>
        {moves.map((m) => {
          const from = getTeam(m.from);
          const to = getTeam(m.to);
          return (
            <li key={m.id}>
              <span className="dim">{shortDate(m.at).replace(/,? \d+:\d+.*$/, '')}</span>
              <span className="career-trade-teams">{from && <TeamBadge team={from} size="sm" />}<i>→</i>{to && <TeamBadge team={to} size="sm" />}<b>{to?.name}</b></span>
              {m.note && <small>{m.note}</small>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
