import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { links } from '../lib/router.js';

// All 16 teams as logo tiles, split by conference, tagged OPEN when no coach has claimed them yet.
export default function TeamWall({ teams, openIds }) {
  const open = new Set(openIds || []);
  return ['Overworld', 'Nether'].map((conf) => (
    <section key={conf} className="card wall-conf">
      <h3>{conf} Conference</h3>
      <div className="wall">
        {teams.filter((t) => t.conference === conf).map((t, i) => (
          <a key={t.id} href={links.team(t.id)} className={`wall-team${open.has(t.id) ? ' open' : ''}`} style={{ '--team': t.color, '--i': i }}>
            <TeamBadge team={t} size="md" />
            <span className="wall-name">{t.name}</span>
            {openIds && <span className="wall-tag">{open.has(t.id) ? 'OPEN' : 'TAKEN'}</span>}
          </a>
        ))}
      </div>
    </section>
  ));
}
