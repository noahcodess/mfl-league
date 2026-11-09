import React from 'react';
import TeamBadge from '../components/TeamBadge.jsx';
import StarRating from '../components/StarRating.jsx';
import { getTeams, capLimit } from '../data/teams.js';
import { getPlayers, teamCapUsed } from '../data/players.js';
import { getIssues } from '../data/issues.js';
import { links } from '../lib/router.js';
import { money, ordinal } from '../lib/format.js';

// League home: every team, ranked by overall rating, with cap and roster size.
export default function LeaguePage() {
  const teams = getTeams();
  const players = teams.reduce((n, t) => n + getPlayers(t.id).length, 0);
  const flagged = getIssues().length;
  return (
    <div>
      <div className="page-head">
        <h1>Teams</h1>
        <p className="dim">{teams.length} teams · {players} players · {money(capLimit())} cap · imported from the Discord roster posts</p>
      </div>
      {flagged > 0 && (
        <a className="notice" href={links.dataCheck}>{flagged} things in the imported data need a look. Open the Data Check.</a>
      )}
      <div className="table-wrap card">
        <table className="table teams">
          <thead><tr><th>#</th><th>Team</th><th>Overall</th><th>Offense</th><th>Defense</th><th>Cap used</th><th>Roster</th></tr></thead>
          <tbody>{teams.map((t) => (
            <tr key={t.id} onClick={() => { window.location.hash = links.team(t.id); }}>
              <td className="dim">{t.overall ? ordinal(t.overall.rank) : '-'}</td>
              <td><a href={links.team(t.id)} className="team-cell"><TeamBadge team={t} size="sm" /> {t.name}</a></td>
              <td><StarRating value={t.overall?.stars} elite={t.overall?.stars === 5} /></td>
              <td><StarRating value={t.offense?.stars} /> <span className="dim">{t.offense && ordinal(t.offense.rank)}</span></td>
              <td><StarRating value={t.defense?.stars} /> <span className="dim">{t.defense && ordinal(t.defense.rank)}</span></td>
              <td>{money(teamCapUsed(t.id))}</td>
              <td>{getPlayers(t.id).length}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
