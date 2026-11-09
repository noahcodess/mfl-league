import React, { useEffect, useState, useCallback } from 'react';
import AccountTable from '../components/AccountTable.jsx';
import CreateCoachForm from '../components/CreateCoachForm.jsx';
import TempPasswordModal from '../components/TempPasswordModal.jsx';
import { listAccounts, createCoach, resetCoach, moveCoach, removeCoach } from '../data/accounts.js';
import { getTeams } from '../data/teams.js';

// Commissioner console: create coach logins, reset passwords, move coaches between teams, remove accounts.
export default function ConsolePage({ readOnly }) {
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [shown, setShown] = useState(null);
  const teams = getTeams().slice().sort((a, b) => a.name.localeCompare(b.name));
  const takenTeams = new Set((accounts || []).filter((a) => a.role === 'coach' && a.team_id).map((a) => a.team_id));

  const reload = useCallback(async () => {
    try {
      setAccounts(await listAccounts());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const act = async (account, work) => {
    setBusyId(account.user_id);
    try {
      await work();
      await reload();
    } catch (err) {
      setError(err.message);
    }
    setBusyId(null);
  };

  const onCreate = async (username, teamId, displayName) => {
    const result = await createCoach(username, teamId, displayName);
    setShown({ ...result, isNew: true });
    await reload();
  };
  const onReset = (a) => window.confirm(`Reset ${a.username}'s password? Their old one stops working right away.`)
    && act(a, async () => setShown(await resetCoach(a.user_id)));
  const onMove = (a, teamId) => act(a, () => moveCoach(a.user_id, teamId));
  const onRemove = (a) => window.confirm(`Remove ${a.username}'s account for good?`) && act(a, () => removeCoach(a.user_id));

  return (
    <div>
      <div className="console-head">
        <div><h1>Commissioner Console</h1><div className="dim">League office tools. Passwords are never visible here, only resettable.</div></div>
        <span className="unlocked">{readOnly ? '👁 OWNER VIEW · READ ONLY' : '● KEY UNLOCKED'}</span>
      </div>
      {readOnly && <div className="notice">You're seeing what the commissioner sees. Only he can make changes, with his key.</div>}
      {error && <div className="notice bad">{error}</div>}
      <div className={`console-grid${readOnly ? ' solo' : ''}`}>
        <section className="card">
          <h3>Accounts {accounts && <span className="count">{accounts.length}</span>}</h3>
          {accounts ? (
            <AccountTable accounts={accounts} teams={teams} takenTeams={takenTeams} busyId={busyId} onReset={onReset} onMove={onMove} onRemove={onRemove} readOnly={readOnly} />
          ) : <div className="empty">Loading accounts...</div>}
        </section>
        {!readOnly && <CreateCoachForm teams={teams} takenTeams={takenTeams} onCreate={onCreate} />}
      </div>
      <TempPasswordModal result={shown} onClose={() => setShown(null)} />
    </div>
  );
}
