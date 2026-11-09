import React, { useState } from 'react';
import Field from './Field.jsx';

// Commissioner form: new coach username, display name and team. Teams that already have a coach are hidden.
export default function CreateCoachForm({ teams, takenTeams, onCreate }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const open = teams.filter((t) => !takenTeams.has(t.id));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onCreate(username, teamId, displayName);
      setUsername('');
      setDisplayName('');
      setTeamId('');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <section className="card">
      <h3>Add a coach</h3>
      <form className="stack-form" onSubmit={submit}>
        <Field id="new-user" label="Username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
          hint="3 to 20 characters: lowercase letters, numbers or _" required autoComplete="off" />
        <Field id="new-name" label="Name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Discord name" />
        <div className="field">
          <label htmlFor="new-team">Team</label>
          <select id="new-team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">No team yet</option>
            {open.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="btn wide" disabled={busy || !username}>{busy ? 'Creating...' : 'Create account'}</button>
      </form>
    </section>
  );
}
