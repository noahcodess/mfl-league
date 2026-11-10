import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import InterestMeter from './InterestMeter.jsx';
import { getTeam } from '../data/teams.js';
import { money } from '../lib/format.js';

// Every team bidding on a free agent: logo, offer, and his interest meter. Best fit on top.
export default function BiddingBoard({ board }) {
  if (!board) return null;
  return (
    <div className="board">
      <div className="board-head"><b>Bidding board</b><span className="dim">{board.length ? `${board.length} team${board.length > 1 ? 's' : ''} bidding` : 'No bids yet'}</span></div>
      {board.map((b) => {
        const team = getTeam(b.team_id);
        return (
          <div key={b.team_id} className={`board-row${b.mine ? ' mine' : ''}`}>
            {team && <TeamBadge team={team} size="sm" />}
            <span className="board-offer"><b>{b.mine ? 'You' : team?.name}</b><small>{b.years} yr · {money(b.per_year)}/yr · {b.role}</small></span>
            <InterestMeter value={b.interest} mine={b.mine} />
          </div>
        );
      })}
      <p className="dim board-note">The top row is the team he likes most, not always the most money. If it's past the tick when the round runs, he signs there. He gets a little less picky every round.</p>
    </div>
  );
}
