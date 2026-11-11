import React from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';

// League feed: a card listing players (top players or the trade block), each row tappable for the player card.
export default function FeedPlayersCard({ icon, title, sub, players, onOpen, ranked, empty }) {
  return (
    <article className="feed-card">
      <header><span className="feed-icon">{icon}</span><div><b>{title}</b><small>{sub}</small></div></header>
      {players?.length ? (
        <ul className="feed-players">
          {players.map((p) => {
            const t = getTeam(p.teamId);
            return (
              <li key={p.id}>
                <button onClick={() => onOpen(p)}>
                  {ranked && <span className="fp-rank">#{p.rank}</span>}
                  <Headshot player={p} team={t} size={40} />
                  <span className="fp-main"><b>{p.name}</b><small>{p.position} · Age {p.age}</small></span>
                  {t && <TeamBadge team={t} size="sm" />}
                  <StarRating value={p.stars} elite={p.elite} peak={p.peakStars} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="dim feed-empty">{empty}</p>}
    </article>
  );
}
