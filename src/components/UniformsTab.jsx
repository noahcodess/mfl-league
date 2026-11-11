import React, { useState } from 'react';
import JerseyCard from './JerseyCard.jsx';
import JerseyEditor from './JerseyEditor.jsx';
import NumberRequests from './NumberRequests.jsx';
import { useJerseys, usePendingJerseys, requestJersey } from '../data/jerseys.js';
import { getPlayers } from '../data/players.js';
import { getTeam } from '../data/teams.js';

const ORDER = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C', 'DE', 'DL', 'DT', 'LB', 'CB', 'SS', 'FS', 'K', 'P'];

// My Team → Uniforms: the team's four game uniforms (edit one, then it goes to the commissioner as a request) and player numbers.
export default function UniformsTab({ teamId }) {
  const team = getTeam(teamId);
  const [version, setVersion] = useState(0);
  const jerseys = useJerseys(team, version);
  const pending = usePendingJerseys(teamId, version);
  const [editing, setEditing] = useState(null);
  const [sent, setSent] = useState('');
  const players = getPlayers(teamId).filter((p) => p.status !== 'retired').sort((a, b) => ORDER.indexOf(a.position) - ORDER.indexOf(b.position) || (a.number ?? 99) - (b.number ?? 99));
  const model = players.find((p) => p.position === 'QB' && p.depth === 'starter') || players[0];
  if (!team) return null;
  return (
    <div className="uniforms">
      <section className="card">
        <header className="numreq-head"><h3>👕 Uniforms</h3><span className="dim">What your team wears on the field</span></header>
        <p className="dim">The home team always wears the darker uniform, so dark alternates are for home games and light ones for the road. Edit any uniform, then send it. The commissioner approves every change, and you'll hear back in your inbox.</p>
        {sent && <p className="numreq-sent">{sent}</p>}
        {editing ? (
          <JerseyEditor team={team} jersey={editing} model={model} submitLabel="Send to commissioner"
            note="Nothing changes until the commissioner approves it."
            onSubmit={(name, colors) => requestJersey(editing.slot, name, colors)}
            onClose={(ok) => { if (ok) { setSent(`📨 Request sent to commissioner. Once he accepts, your ${editing.slot <= 2 ? editing.name : 'new'} jersey goes on.`); setVersion((v) => v + 1); } setEditing(null); }} />
        ) : (
          <div className="jersey-grid">
            {jerseys.map((j) => <JerseyCard key={j.slot} jersey={j} model={model} pending={pending.find((p) => p.slot === j.slot)} onEdit={() => { setSent(''); setEditing(j); }} />)}
          </div>
        )}
      </section>
      <NumberRequests team={team} players={players} />
    </div>
  );
}
