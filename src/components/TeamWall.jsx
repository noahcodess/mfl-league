import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { links } from '../lib/router.js';

// All 16 teams as logo tiles, split by conference: OPEN (claimable), TAKEN (has a coach) or RESERVED (held back).
export default function TeamWall({ teams, openIds }) {
  const open = new Set(openIds || []);
  return ['Overworld', 'Nether'].map((conf) => (
    <section key={conf} className="card wall-conf">
      <h3>{conf} Conference</h3>
      <div className="wall">
        {teams.filter((t) => t.conference === conf).map((t, i) => (
          <a key={t.id} href={links.team(t.id)} className={`wall-team${!t.reserved && open.has(t.id) ? ' open' : ''}`} style={{ '--team': t.color, '--i': i }}>
            <TeamBadge team={t} size="md" />
            <span className="wall-name">{t.name}</span>
            {t.reserved ? <span className="wall-tag reserved">RESERVED</span>
              : openIds && <span className="wall-tag">{open.has(t.id) ? 'OPEN' : 'TAKEN'}</span>}
          </a>
        ))}
      </div>
    </section>
  ));
}
