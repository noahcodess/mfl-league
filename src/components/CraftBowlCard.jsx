import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { useCraftBowls, trophyImg } from '../data/craftBowls.js';
import { getTeam } from '../data/teams.js';

// League feed: the Craft Bowl trophy, every champion (newest first) and the most titles by team and by coach.
export default function CraftBowlCard() {
  const bowls = useCraftBowls() || [];
  const tally = (key) => Object.entries(bowls.reduce((m, b) => (b[key] ? { ...m, [b[key]]: (m[b[key]] || 0) + 1 } : m), {})).sort((a, b) => b[1] - a[1]);
  const teams = tally('champion');
  const coaches = tally('coach');
  return (
    <article className="feed-card cb-card">
      <header><img className="cb-trophy" src={trophyImg()} alt="Craft Bowl trophy" /><div><b>Craft Bowl champions</b><small>The league's history, newest first</small></div></header>
      {bowls.length ? (
        <>
          <ul className="cb-list">
            {bowls.map((b) => {
              const t = getTeam(b.champion); const r = getTeam(b.runnerUp);
              return (
                <li key={b.id}>
                  <span className="cb-season">{b.season ? `S${b.season}` : 'S?'}</span>
                  {t && <TeamBadge team={t} size="sm" />}
                  <span className="cb-main"><b>{t?.name || b.champion}</b><small>{[r && `beat the ${r.name}`, b.score, b.coach && `Coach ${b.coach}`, b.mvp && `MVP ${b.mvp}`].filter(Boolean).join(' · ') || 'Details to come'}</small></span>
                </li>
              );
            })}
          </ul>
          <div className="cb-legacy">
            <div><small>Most titles</small>{teams.slice(0, 3).map(([id, n]) => <span key={id}>{getTeam(id)?.name || id} <b>{n}</b></span>)}</div>
            {coaches.length > 0 && <div><small>Winningest coaches</small>{coaches.slice(0, 3).map(([c, n]) => <span key={c}>Coach {c} <b>{n}</b></span>)}</div>}
          </div>
        </>
      ) : <p className="dim feed-empty">No champions yet.</p>}
    </article>
  );
}
