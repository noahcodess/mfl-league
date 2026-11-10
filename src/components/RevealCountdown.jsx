import React from 'react';
import { createPortal } from 'react-dom';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';

// "Revealed in 3, 2, 1" before a first-round pick shows. The commissioner's screen also shows the name, so he can say it on the call.
export default function RevealCountdown({ pick, seconds, showName }) {
  const team = getTeam(pick.team_id) || { name: pick.team_id, code: pick.team_id };
  return createPortal(
    <div className="countdown" style={{ '--team': team.color, '--team-accent': team.accent }}>
      <TeamBadge team={team} size="xl" />
      <div className="countdown-label">With pick #{pick.pick_no}, the {team.name} select...</div>
      <div className="countdown-num" key={seconds}>{seconds}</div>
      <div className="countdown-sub">Revealed in</div>
      {showName && pick.player && <div className="countdown-name">🎙️ Say it: <b>{pick.player.name}</b>, {pick.player.position}, {pick.player.college}</div>}
    </div>,
    document.body,
  );
}
