import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeams, getTeam, getConferences, currentSeason } from '../data/teams.js';
import { standings } from '../lib/seasonStats.js';
import { links } from '../lib/router.js';

export const confClass = (c) => (c ? `conf-${String(c).toLowerCase().replace(/[^a-z]/g, '')}` : '');

// Live: the standings by conference (in that conference's colors), or every team in one table, ranked by the league's
// tiebreakers (tiebreak.js): wins, point difference, streak.
export default function ConfStandings({ rec, through }) {
  const confs = [...getConferences(), 'All teams'];
  const [conf, setConf] = useState(confs[0]);
  const all = conf === 'All teams', confOf = Object.fromEntries(getTeams().map((t) => [t.id, t.conference]));
  const table = all ? standings(getTeams().map((t) => ({ ...t, conference: 'all' })), rec, confOf, currentSeason()).all : standings(getTeams(), rec, confOf, currentSeason())[conf] || [];
  return (
    <article className={`lv-card lv-standings conf-card ${all ? '' : confClass(conf)}`}>
      <header><span>📊</span><div><b>Standings</b><small>{through ? `After Week ${through}` : 'This season'}</small></div></header>
      <div className="lv-tabs conf-tabs">{confs.map((c) => <button key={c} className={`${c === conf ? 'on' : ''} ${confClass(c)}`} onClick={() => setConf(c)}>{c}</button>)}</div>
      <table className="cs-table">
        <thead><tr><th>#</th><th>Team</th><th>W-L</th><th>Diff</th><th>Strk</th></tr></thead>
        <tbody>
          {table.map((r, i) => {
            const t = getTeam(r.id), diff = r.pf - r.pa;
            return (
              <tr key={r.id} className={all ? `conf-row ${confClass(t?.conference)}` : ''}>
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
