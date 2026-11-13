import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeams, getTeam, getConferences } from '../data/teams.js';
import { standings } from '../lib/seasonStats.js';
import { links } from '../lib/router.js';

// Live: the standings by conference, or every team in one table (wins, point difference, streak).
export default function ConfStandings({ rec, through }) {
  const confs = [...getConferences(), 'All teams'];
  const [conf, setConf] = useState(confs[0]);
  const table = conf === 'All teams' ? standings(getTeams().map((t) => ({ ...t, conference: 'all' })), rec).all : standings(getTeams(), rec)[conf] || [];
  return (
    <article className="lv-card lv-standings">
      <header><span>📊</span><div><b>Standings</b><small>{through ? `After Week ${through}` : 'This season'}</small></div></header>
      <div className="lv-tabs">{confs.map((c) => <button key={c} className={c === conf ? 'on' : ''} onClick={() => setConf(c)}>{c}</button>)}</div>
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
