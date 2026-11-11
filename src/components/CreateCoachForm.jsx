import React, { useState } from 'react';

// Commissioner form: "Coach" + a name (required) and a team, which makes a one-time passcode to send them.
// Teams that already have a coach (or a passcode waiting) are hidden.
export default function CreateCoachForm({ teams, takenTeams, onCreate }) {
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const open = teams.filter((t) => !takenTeams.has(t.id));
  const clean = name.replace(/^\s*coach\s+/i, '');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onCreate(clean.trim(), teamId);
      setName('');
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
        <div className="field">
          <label htmlFor="new-name">Name</label>
          <div className="coach-name-box">
            <span>Coach</span>
            <input id="new-name" value={clean} onChange={(e) => setName(e.target.value)} maxLength={20} required autoComplete="off"
              placeholder="We recommend first name, Discord name or nickname" />
          </div>
          <small className="hint">Short and simple: Coach Noah, Coach Fins, Coach Mason.</small>
        </div>
        <div className="field">
          <label htmlFor="new-team">Team</label>
          <select id="new-team" value={teamId} onChange={(e) => setTeamId(e.target.value)} required>
            <option value="">Pick a team</option>
            {open.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="btn wide" disabled={busy || clean.trim().length < 2 || !teamId}>{busy ? 'Making passcode...' : 'Make one-time passcode'}</button>
        <p className="dim help">You send them the passcode. They enter it once on the login page, then make their own username and password. You never see their password.</p>
      </form>
    </section>
  );
}
