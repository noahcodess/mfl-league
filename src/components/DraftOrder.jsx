import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';
import { store } from '../data/store.js';

// The draft order by round: pick number, who owns it now, and whose pick it was if it changed hands.
export default function DraftOrder({ season, order, myTeamId }) {
  const [round, setRound] = useState(1);
  if (!order?.length) return <p className="dim">The draft order isn't set yet. It comes from last season's final standings.</p>;
  const pickFor = (teamId) => {
    const code = getTeam(teamId)?.code;
    return store.league.picks.find((p) => p.season === season && p.round === round && p.originalCode === code);
  };
  return (
    <section className="card draft-order">
      <div className="board-head"><h3>Draft order</h3>
        <div className="seg">{[1, 2, 3].map((r) => <button key={r} className={round === r ? 'on' : ''} onClick={() => setRound(r)}>Round {r}</button>)}</div>
      </div>
      <ol className="order-list">
        {order.map((teamId, i) => {
          const pick = pickFor(teamId);
          const owner = pick ? getTeam(pick.ownerId) : null;
          const traded = owner && owner.id !== teamId;
          return (
            <li key={teamId} className={owner?.id === myTeamId ? 'mine' : ''}>
              <span className="pick-no">{round}.{String(i + 1).padStart(2, '0')}</span>
              {owner ? <TeamBadge team={owner} size="sm" /> : <span className="no-pick">-</span>}
              <span className="order-team">{owner ? owner.name : 'Pick not on the books'}{traded && <small className="dim"> via {getTeam(teamId)?.code}</small>}</span>
            </li>
          );
        })}
      </ol>
      <p className="dim board-note">Worst record picks first; playoff teams go by how far they got; the Craft Bowl champion picks last.</p>
    </section>
  );
}
