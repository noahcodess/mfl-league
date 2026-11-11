import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import StarRating from './StarRating.jsx';
import { getTeams, getConferences } from '../data/teams.js';
import { links } from '../lib/router.js';

const PLAYOFF = { champion: '🏆', craft_bowl_loss: '🥈', conference: 'Conf', divisional: 'Div' };

// League feed: each conference ranked by team rating right now, with last season's record next to it.
export default function StandingsCard({ results, season }) {
  const conferences = getConferences();
  const [conf, setConf] = useState(conferences[0]);
  const rec = Object.fromEntries((results || []).map((r) => [r.teamId, r]));
  const teams = getTeams().filter((t) => t.conference === conf).sort((a, b) => (a.overall?.rank ?? 99) - (b.overall?.rank ?? 99));
  return (
    <article className="feed-card">
      <header><span className="feed-icon">📊</span><div><b>Conference standings</b><small>Ranked by team rating now{season ? ` · record from Season ${season}` : ''}</small></div></header>
      <div className="seg feed-seg">{conferences.map((c) => <button key={c} className={c === conf ? 'on' : ''} onClick={() => setConf(c)}>{c}</button>)}</div>
      <ol className="feed-standings">
        {teams.map((t, i) => {
          const r = rec[t.id];
          return (
            <li key={t.id}>
              <span className="fs-rank">{i + 1}</span>
              <a href={links.team(t.id)} className="fs-team"><TeamBadge team={t} size="sm" /><b>{t.name}</b></a>
              <span className="fs-rec">{r ? `${r.wins}-${r.losses}` : '-'}{r && PLAYOFF[r.playoff] && <em>{PLAYOFF[r.playoff]}</em>}</span>
              <StarRating value={t.overall?.stars} />
            </li>
          );
        })}
      </ol>
    </article>
  );
}
