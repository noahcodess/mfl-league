import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeams, getTeam, getConferences } from '../data/teams.js';
import { standings } from '../lib/seasonStats.js';
import { links } from '../lib/router.js';

// Live: this season's standings by conference (wins, point difference, streak).
export default function ConfStandings({ rec }) {
  const confs = getConferences();
  const [conf, setConf] = useState(confs[0]);
  const table = standings(getTeams(), rec)[conf] || [];
  return (
    <article className="feed-card">
      <header><span className="feed-icon">📊</span><div><b>Standings</b><small>This season</small></div></header>
      <div className="seg feed-seg">{confs.map((c) => <button key={c} className={c === conf ? 'on' : ''} onClick={() => setConf(c)}>{c}</button>)}</div>
      <table className="cs-table">
        <thead><tr><th>#</th><th>Team</th><th>W-L</th><th>Diff</th><th>Strk</th></tr></thead>
        <tbody>
          {table.map((r, i) => {
            const t = getTeam(r.id), diff = r.pf - r.pa;
            return (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td><a href={links.team(r.id)} className="cs-team" title={t?.name}><TeamBadge team={t} size="sm" /><span>{t?.name}</span></a></td>
                <td><b>{r.w}-{r.l}</b></td>
                <td className={diff > 0 ? 'cs-up' : diff < 0 ? 'cs-down' : ''}>{diff > 0 ? `+${diff}` : diff}</td>
                <td>{r.streak}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}
