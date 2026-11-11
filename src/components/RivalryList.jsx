import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { useRivalries, addRivalry, removeRivalry } from '../data/games.js';
import { getTeams, getTeam } from '../data/teams.js';

// Commissioner's Desk → Teams → Rivalries: who the big rivals are. Rivals always meet in the schedule (when the rules allow),
// and rivalry games get a ⚔️ tag and count as better matchups for prime time.
export default function RivalryList({ canControl }) {
  const [version, setVersion] = useState(0);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const rows = useRivalries(version);
  const act = async (fn) => { setError(''); try { await fn(); setVersion((v) => v + 1); } catch (e) { setError(e.message); } };
  return (
    <section className="card rivals">
      <h3>⚔️ Rivalries <span className="count">{rows?.length ?? ''}</span></h3>
      <p className="dim">Rivals always play each other in the schedule (conference rivals do anyway), and their games count as better matchups for prime time.</p>
      <ul className="rival-list">
        {(rows || []).map((r) => {
          const x = getTeam(r.team_a); const y = getTeam(r.team_b);
          return (
            <li key={r.id}>
              {x && <TeamBadge team={x} size="sm" />}<b>{x?.name}</b><span className="vs">vs</span>{y && <TeamBadge team={y} size="sm" />}<b>{y?.name}</b>
              {r.name && <em>"{r.name}"</em>}
              {canControl && <ConfirmButton className="btn small ghost" label="Remove" title="Remove this rivalry?" yes="Remove" text="Future schedules won't force this matchup." onConfirm={() => act(() => removeRivalry(r.id))} />}
            </li>
          );
        })}
      </ul>
      {canControl && (
        <div className="rival-add">
          <select value={a} onChange={(e) => setA(e.target.value)}><option value="">Team</option>{getTeams().map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <span className="vs">vs</span>
          <select value={b} onChange={(e) => setB(e.target.value)}><option value="">Team</option>{getTeams().filter((t) => t.id !== a).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input placeholder="Nickname (optional)" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <button className="btn small" disabled={!a || !b} onClick={() => act(async () => { await addRivalry(a, b, name); setA(''); setB(''); setName(''); })}>Add rivalry</button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
