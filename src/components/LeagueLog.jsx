import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';

// The permanent league log: every birthday, retirement, contract, signing, draft pick and award, newest first.
const ICONS = { birthday: '🎂', retired: '👋', contract_expired: '📜', free_agent: '🆓', signed: '✍️', resigned: '✍️', draft: '🎓', season_start: '🏈', award: '🏆' };

export default function LeagueLog({ events, limit = 30, title = 'League log' }) {
  return (
    <section className="card">
      <h3>{title} {events.length > 0 && <span className="count">{events.length}</span>}</h3>
      {!events.length && <p className="dim">Nothing yet. Every league move gets recorded here for good.</p>}
      <ul className="log">
        {events.slice(0, limit).map((e) => {
          const team = e.teamId ? getTeam(e.teamId) : null;
          return (
            <li key={e.id}>
              <span className="log-icon">{ICONS[e.kind] || '•'}</span>
              {team && <TeamBadge team={team} size="xs" />}
              <span className="log-text">{e.summary}</span>
              <span className="log-when">S{e.season}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
