import React, { useState } from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import TeamBadge from './TeamBadge.jsx';
import PlayerEditor from './PlayerEditor.jsx';
import { getAllPlayers } from '../data/players.js';
import { getTeams, getTeam } from '../data/teams.js';

// Commissioner's Desk → Players: search every player (name, team, position), tap one to edit anything about him.
export default function PlayerEditList({ canControl, reload }) {
  const [q, setQ] = useState('');
  const [team, setTeam] = useState('');
  const [open, setOpen] = useState(null);
  const words = q.trim().toLowerCase();
  const list = getAllPlayers()
    .filter((p) => (team === 'fa' ? !p.teamId : team ? p.teamId === team : true))
    .filter((p) => !words || p.name.toLowerCase().includes(words) || p.position.toLowerCase() === words)
    .sort((a, b) => (b.stars || 0) - (a.stars || 0) || a.name.localeCompare(b.name));
  return (
    <div>
      <div className="pe-search">
        <input placeholder="🔍 Search a name or position (QB, CB...)" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">Every team</option><option value="fa">Free agents</option>
          {getTeams().map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span className="dim">{list.length} players</span>
      </div>
      <ul className="pe-list">
        {list.slice(0, 80).map((p) => {
          const t = getTeam(p.teamId);
          return (
            <li key={p.id}>
              <button onClick={() => setOpen(p)}>
                <Headshot player={p} team={t} size={40} />
                <span className="pe-main"><b>{p.name}</b><small>{p.position} · Age {p.age ?? '-'} · #{p.number ?? '-'}</small></span>
                {t ? <TeamBadge team={t} size="sm" /> : <span className="dim">FA</span>}
                <StarRating value={p.stars} elite={p.elite} peak={p.peakStars} />
                <span className="pe-edit">✏️</span>
              </button>
            </li>
          );
        })}
      </ul>
      {list.length > 80 && <p className="dim">Showing the top 80. Search or pick a team to narrow it down.</p>}
      {open && <PlayerEditor player={open} canControl={canControl} onClose={() => setOpen(null)} onSaved={reload} />}
    </div>
  );
}
