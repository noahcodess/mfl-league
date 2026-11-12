import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { useStadiums, capacityText } from '../data/stadiums.js';
import { getTeams } from '../data/teams.js';

// League feed: every stadium in the league, biggest first. Tap one to open that team's page and see its field.
export default function StadiumsCard() {
  const stadiums = useStadiums();
  const rows = getTeams().filter((t) => stadiums[t.id]).sort((a, b) => stadiums[b.id].capacity - stadiums[a.id].capacity);
  return (
    <article className="feed-card">
      <header><span className="feed-icon">🏟️</span><div><b>Stadiums</b><small>All 16 homes, biggest first</small></div></header>
      <ul className="stadium-list">
        {rows.map((t) => (
          <li key={t.id}><TeamBadge team={t} size="sm" /><span><b><a href={`#team-${t.id}`}>{stadiums[t.id].name}</a></b><small>{t.name}</small></span><em>{capacityText(stadiums[t.id].capacity)}</em></li>
        ))}
      </ul>
    </article>
  );
}
