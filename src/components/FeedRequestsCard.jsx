import React from 'react';
import Headshot from './Headshot.jsx';
import TeamBadge from './TeamBadge.jsx';
import { useTradeRequests } from '../data/morale.js';
import { getAllPlayers } from '../data/players.js';
import { getTeam } from '../data/teams.js';

const STATUS = { open: '📣 Wants out', traded: '✅ Got his trade', released: '✂️ Cut at the deadline', withdrawn: '↩️ Called off' };

// League feed: players who asked for a trade (still waiting first), and how the last few ended.
export default function FeedRequestsCard({ onOpen }) {
  const list = useTradeRequests(0, { all: true });
  const byId = Object.fromEntries(getAllPlayers().map((p) => [p.id, p]));
  const rows = (list || []).filter((r) => byId[r.playerId]).sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1)).slice(0, 8);
  return (
    <article className="feed-card">
      <header><span className="feed-icon">📣</span><div><b>Trade requests</b><small>Upset players who want out. Not traded by the deadline means cut.</small></div></header>
      {rows.length ? (
        <ul className="feed-players">
          {rows.map((r) => {
            const p = byId[r.playerId]; const t = getTeam(r.teamId);
            return (
              <li key={r.id}><button onClick={() => onOpen(p)}>
                <Headshot player={p} team={getTeam(p.teamId) || t} size={40} />
                <span className="fp-main"><b>{p.name}</b><small>{p.position} · {STATUS[r.status]}</small></span>
                {t && <TeamBadge team={t} size="sm" />}
              </button></li>
            );
          })}
        </ul>
      ) : <p className="dim feed-empty">No one has asked out. Locker rooms are calm.</p>}
    </article>
  );
}
