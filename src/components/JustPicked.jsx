import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import Headshot from './Headshot.jsx';
import { getTeam } from '../data/teams.js';
import { roundOf } from '../lib/draftClock.js';

// Coaches' draft room: when a pick is announced, the "on the clock" card shows who was taken for a few seconds. No animation and
// no grade; the full show is only on the commissioner's stage.
export default function JustPicked({ pick, mine }) {
  const team = getTeam(pick.team_id) || { name: pick.team_id }, p = pick.player || {};
  return (
    <section className={`otc otc-picked${mine ? ' otc-mine' : ''}`} style={{ '--team': team.color, '--team-accent': team.accent }}>
      <div className="otc-team">
        <div className="otc-logo"><Headshot player={p} size={96} /></div>
        <div className="otc-words">
          <div className="otc-label">The pick · #{pick.pick_no} {roundOf(pick)}</div>
          <h2 className="otc-name">{p.name || 'Unknown'}</h2>
          <div className="otc-meta">{p.position}{p.college ? ` · ${p.college}` : ''}</div>
          <div className="otc-picked-team"><TeamBadge team={team} size="sm" /> {mine ? 'Your pick' : team.name}</div>
        </div>
      </div>
    </section>
  );
}
