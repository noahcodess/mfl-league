import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';

// The next few picks in a row. Coach-run teams get a person tag; the commissioner also sees if that coach is online.
export default function DraftUpNext({ slots, isBot, presence, myTeamId }) {
  if (!slots?.length) return null;
  return (
    <div className="upnext">
      <span className="upnext-title">Up next</span>
      <ol>
        {slots.map((s, i) => {
          const team = getTeam(s.team_id) || { name: s.team_id, code: s.team_id };
          const coach = presence?.[s.team_id];
          return (
            <li key={s.pick_no} className={s.team_id === myTeamId ? 'mine' : ''} style={{ '--i': i }}>
              <span className="upnext-no">#{s.pick_no}</span>
              <TeamBadge team={team} size="sm" />
              <span className="upnext-code">{team.code}</span>
              {!isBot(s.team_id) && <span className="upnext-human" title={coach ? `${coach.username}: ${coach.online ? 'online' : 'offline'}` : 'Coach-run team'}>👤{coach && <i className={`dot${coach.online ? ' on' : ''}`} />}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
