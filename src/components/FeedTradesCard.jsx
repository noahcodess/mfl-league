import React from 'react';
import Headshot from './Headshot.jsx';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';

// League feed: the latest trades as posts (who moved where, the season and date, what he was traded for).
export default function FeedTradesCard({ moves, onOpen }) {
  return (
    <article className="feed-card">
      <header><span className="feed-icon">🔁</span><div><b>Recent trades</b><small>Newest first</small></div></header>
      {moves?.length ? (
        <ul className="feed-trades">
          {moves.map((m) => {
            const from = getTeam(m.from);
            const to = getTeam(m.to);
            return (
              <li key={m.id} style={{ '--team': to?.color }}>
                <button onClick={() => onOpen(m.player)}>
                  <Headshot player={m.player} team={to} size={44} />
                  <span className="ft-main">
                    <b>{m.player.position} {m.player.name}</b>
                    <span className="ft-teams">{from && <TeamBadge team={from} size="sm" />}<i>→</i>{to && <TeamBadge team={to} size="sm" />}<span>{to?.name}</span></span>
                    {m.note && <small>{m.note}</small>}
                  </span>
                  <span className="ft-when"><b>{m.season ? `S${m.season}` : ''}</b><small>{new Date(m.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="dim feed-empty">No trades yet.</p>}
    </article>
  );
}
