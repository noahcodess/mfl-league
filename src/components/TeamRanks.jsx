import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';
import { topOffenses, topDefenses } from '../lib/teamRanks.js';

const f1 = (n) => n.toFixed(1);

// Live: the five best offenses (points and yards per game) or defenses (fewest points and yards allowed, sacks, takeaways).
export default function TeamRanks({ stats, kind, through }) {
  const off = kind === 'offense', list = off ? topOffenses(stats) : topDefenses(stats);
  return (
    <article className="lv-card">
      <header><span>{off ? '🔥' : '🧱'}</span><div><b>Top {off ? 'offenses' : 'defenses'}</b><small>Through Week {through}</small></div></header>
      {!list.length ? <p className="dim">No games finished yet.</p> : (
        <ol className="lv-rank">
          {list.map((t, i) => {
            const team = getTeam(t.id);
            return (
              <li key={t.id}>
                <span className="lv-n">{i + 1}</span><TeamBadge team={team} size="sm" />
                <div><b>{team?.name}</b><small>{off ? `${f1(t.ypg)} yds/game` : `${f1(t.yapg)} yds allowed · ${t.sacks} sacks · ${t.take} INT`}</small></div>
                <span className="lv-big">{f1(off ? t.ppg : t.papg)}<small>{off ? 'pts/g' : 'allowed/g'}</small></span>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
