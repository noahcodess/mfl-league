import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { getTeam } from '../data/teams.js';
import { shortDate } from '../lib/format.js';

// Passcodes that haven't been used yet: who they're for, which team, when they expire, and a cancel button.
export default function InviteList({ invites, readOnly, onCancel }) {
  if (!invites?.length) return null;
  return (
    <div className="invites">
      <h4>Waiting to join <span className="count">{invites.length}</span></h4>
      {invites.map((i) => {
        const team = getTeam(i.team_id);
        return (
          <div key={i.id} className="invite-row">
            {team && <TeamBadge team={team} size="sm" />}
            <b>Coach {i.coach_name}</b>
            <span className="dim">{team?.name} · expires {shortDate(i.expires_at)}</span>
            {!readOnly && <ConfirmButton className="btn small ghost" label="Cancel" title={`Cancel Coach ${i.coach_name}'s passcode?`} yes="Cancel it"
              text="The passcode stops working right away. You can make a new one." onConfirm={() => onCancel(i)} />}
          </div>
        );
      })}
    </div>
  );
}
