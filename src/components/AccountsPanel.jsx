import React, { useEffect, useState, useCallback } from 'react';
import AccountTable from './AccountTable.jsx';
import CreateCoachForm from './CreateCoachForm.jsx';
import TempPasswordModal from './TempPasswordModal.jsx';
import InviteModal from './InviteModal.jsx';
import InviteList from './InviteList.jsx';
import { listAccounts, resetCoach, moveCoach, removeCoach, createInvite, listInvites, cancelInvite } from '../data/accounts.js';
import { getTeams } from '../data/teams.js';

// Commissioner's Desk → Accounts: make one-time passcodes for new coaches, see who's waiting to join,
// reset passwords (never see them), move coaches between teams, remove accounts.
export default function AccountsPanel({ readOnly, testMode }) {
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [shown, setShown] = useState(null);
  const [invites, setInvites] = useState([]);
  const [invite, setInvite] = useState(null);
  const teams = getTeams().slice().sort((a, b) => a.name.localeCompare(b.name));
  const takenTeams = new Set([...(accounts || []).filter((a) => a.role === 'coach' && a.team_id).map((a) => a.team_id), ...invites.map((i) => i.team_id)]);

  const reload = useCallback(async () => {
    try {
      setAccounts(await listAccounts());
      setInvites(await listInvites());
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

  const onCreate = async (name, teamId) => {
    setInvite(await createInvite(name, teamId));
    await reload();
  };
  const onCancel = async (i) => { await cancelInvite(i.id); await reload(); };
  const onReset = (a) => window.confirm(`Reset ${a.username}'s password? Their old one stops working right away.`)
    && act(a, async () => setShown(await resetCoach(a.user_id)));
  const onMove = (a, teamId) => act(a, () => moveCoach(a.user_id, teamId));
  const onRemove = (a) => window.confirm(`Remove ${a.username}'s account for good?`) && act(a, () => removeCoach(a.user_id));

  return (
    <div>
      <div className="acct-head">
        <span className="dim">Passwords are never visible here, only resettable.</span>
        <span className="unlocked">{readOnly ? '👁 OWNER VIEW · READ ONLY' : testMode ? '🧪 TEST MODE · NO KEY NEEDED' : '● KEY UNLOCKED'}</span>
      </div>
      {readOnly && <div className="notice">You're seeing what the commissioner sees. Only he can make changes, with his key.</div>}
      {testMode && <div className="notice">Test mode is on: you have full commissioner powers without the key. It gets switched off before the league goes live.</div>}
      {error && <div className="notice bad">{error}</div>}
      <div className={`console-grid${readOnly ? ' solo' : ''}`}>
        <section className="card">
          <h3>Accounts {accounts && <span className="count">{accounts.length}</span>}</h3>
          {accounts ? (
            <AccountTable accounts={accounts} teams={teams} takenTeams={takenTeams} busyId={busyId} onReset={onReset} onMove={onMove} onRemove={onRemove} readOnly={readOnly} />
          ) : <div className="empty">Loading accounts...</div>}
          <InviteList invites={invites} readOnly={readOnly} onCancel={onCancel} />
        </section>
        {!readOnly && <CreateCoachForm teams={teams} takenTeams={takenTeams} onCreate={onCreate} />}
      </div>
      <TempPasswordModal result={shown} onClose={() => setShown(null)} />
      <InviteModal invite={invite} onClose={() => setInvite(null)} />
    </div>
  );
}
