import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { shortDate } from '../lib/format.js';

// Every account: username, team (changeable), first-login status, last login, and reset/remove buttons for coaches.
export default function AccountTable({ accounts, teams, takenTeams, onReset, onMove, onRemove, busyId }) {
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  if (!accounts.length) return <div className="empty">No accounts yet.</div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Account</th><th>Role</th><th>Team</th><th>Status</th><th>Last login</th><th /></tr></thead>
        <tbody>
          {accounts.map((a) => {
            const team = teamById[a.team_id];
            const coach = a.role === 'coach';
            return (
              <tr key={a.user_id}>
                <td><div className="acct-user">{a.username}</div>{a.display_name && <div className="acct-name">{a.display_name}</div>}</td>
                <td><span className={`role-tag ${a.role}`}>{a.role}</span></td>
                <td>
                  {coach ? (
                    <span className="acct-team">
                      {team && <TeamBadge team={team} size="sm" />}
                      <select value={a.team_id || ''} disabled={busyId === a.user_id} onChange={(e) => onMove(a, e.target.value)}>
                        <option value="">No team</option>
                        {teams.filter((t) => t.id === a.team_id || !takenTeams.has(t.id)).map((t) => <option key={t.id} value={t.id}>{t.code}</option>)}
                      </select>
                    </span>
                  ) : <span className="dim">League office</span>}
                </td>
                <td>{a.must_change_password ? <span className="status-tag pending">Waiting for first login</span> : <span className="status-tag ok">Active</span>}</td>
                <td className="dim">{a.last_sign_in_at ? shortDate(a.last_sign_in_at) : 'Never'}</td>
                <td>
                  {coach && (
                    <div className="acct-actions">
                      <button className="btn small ghost" disabled={busyId === a.user_id} onClick={() => onReset(a)}>Reset password</button>
                      <button className="btn small danger" disabled={busyId === a.user_id} onClick={() => onRemove(a)}>Remove</button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
