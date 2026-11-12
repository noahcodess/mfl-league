import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';
import { getPlayers } from '../data/players.js';
import { weekStars } from '../lib/seasonStats.js';

const ICON = { pass: '🎯', rush: '💨', rec: '🙌', def: '🛡️' };

// Live → a week: the best passer, rusher, receiver and defender from the games already finished.
export default function WeekStars({ week }) {
  const stars = weekStars(week);
  return (
    <article className="feed-card">
      <header><span className="feed-icon">⭐</span><div><b>Top players</b><small>Week {week.week}{stars.length ? '' : ' · after the first game ends'}</small></div></header>
      {!stars.length ? <p className="dim">Nobody has played yet this week.</p> : (
        <ul className="ws-list">
          {stars.map((s) => {
            const p = getPlayers(s.team).find((x) => x.id === s.id);
            return (
              <li key={s.key}>
                <span className="ws-icon" title={s.label}>{ICON[s.key]}</span>
                <TeamBadge team={getTeam(s.team)} size="sm" />
                <div><b>{p?.name || 'Unknown'}</b> <small className="dim">{p?.position} · {s.label}</small><small>{s.text}</small></div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
