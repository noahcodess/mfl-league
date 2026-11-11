import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import TeamEditor from './TeamEditor.jsx';
import RivalryList from './RivalryList.jsx';
import { getTeams, getConferences } from '../data/teams.js';

// Commissioner's Desk → Teams: every team as a card (logo, name, abbreviation, colors; tap one to edit it), and the rivalries.
export default function TeamEditList({ canControl, reload }) {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <p className="dim">Change a team's location and name separately (Ocean Monument + Guardians), its abbreviation, colors and conference, or upload a new logo (PNG with a see-through background).</p>
      {getConferences().map((c) => (
        <section key={c} className="te-conf">
          <h3>{c}</h3>
          <div className="te-cards">
            {getTeams().filter((t) => t.conference === c).map((t, i) => (
              <button key={t.id} className="te-card" style={{ '--team': t.color, '--team-accent': t.accent, '--i': i }} onClick={() => setOpen(t)}>
                <TeamBadge team={t} size="md" />
                <span><b>{t.name}</b><small>{t.code}{t.logoUrl ? ' · custom logo' : ''}</small></span>
                <span className="te-swatch"><i style={{ background: t.color }} /><i style={{ background: t.accent }} /></span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <RivalryList canControl={canControl} />
      {open && <TeamEditor team={open} canControl={canControl} onClose={() => setOpen(null)} onSaved={reload} />}
    </div>
  );
}
