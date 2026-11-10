import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import ClockRing from './ClockRing.jsx';
import { getTeam } from '../data/teams.js';
import { roundOf } from '../lib/draftClock.js';

// The big stage: whose pick it is, the clock, and what's happening (thinking, the pick is in, paused).
export default function OnTheClock({ info, myTeamId, presence, onPickNow }) {
  const slot = info.current;
  if (!slot) return null;
  const team = getTeam(slot.team_id) || { name: slot.team_id, code: slot.team_id };
  const via = slot.original_team_id !== slot.team_id ? getTeam(slot.original_team_id) : null;
  const mine = myTeamId && slot.team_id === myTeamId;
  const coach = presence?.[slot.team_id];
  const state = info.phase === 'paused' ? 'paused' : info.pickState === 'in' || info.pickState === 'accepted' ? 'pending' : info.reveal ? 'next' : 'clock';
  return (
    <section className={`otc otc-${state}${mine ? ' otc-mine' : ''}`} style={{ '--team': team.color, '--team-accent': team.accent }} key={slot.pick_no}>
      <div className="otc-beams" aria-hidden="true"><i /><i /><i /></div>
      <div className="otc-team">
        <div className="otc-logo"><TeamBadge team={team} size="xl" /></div>
        <div className="otc-words">
          <div className="otc-label">{{ paused: 'Draft paused', pending: 'The pick is in', next: 'Up next', clock: 'On the clock' }[state]}</div>
          <h2 className="otc-name">{team.name}</h2>
          <div className="otc-meta">
            <span className="otc-pick">#{slot.pick_no}</span> {roundOf(slot)}
            {via && <span className="otc-via"> · via {via.code}</span>}
          </div>
          {coach && <div className="otc-coach"><span className={`dot${coach.online ? ' on' : ''}`} /> {coach.username} {coach.online ? 'is online' : 'is offline'}</div>}
          {mine && state === 'clock' && <button className="btn otc-go" onClick={onPickNow}>🏈 You're on the clock: make your pick</button>}
          {mine && state === 'pending' && <div className="otc-wait">📨 {info.pickState === 'in' ? 'Pick sent. Waiting for the commissioner to accept it.' : 'Accepted! It gets revealed when the commissioner announces it.'}</div>}
        </div>
      </div>
      <ClockRing left={info.left} full={info.full} paused={state === 'paused'} label={state === 'pending' ? (info.pickState === 'in' ? 'pick is in' : 'to be announced') : state === 'next' ? 'starting' : 'on the clock'} />
    </section>
  );
}
