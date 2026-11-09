import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import StarRating from './StarRating.jsx';
import { getPlayers, teamCapUsed } from '../data/players.js';
import { links } from '../lib/router.js';
import { money, ordinal } from '../lib/format.js';

// One conference's teams, best overall rating first.
export default function ConferenceTable({ name, teams }) {
  return (
    <section className="card conf">
      <h3>{name} Conference</h3>
      <div className="table-wrap">
        <table className="table teams">
          <thead><tr><th>Lg</th><th>Team</th><th>Overall</th><th>Offense</th><th>Defense</th><th>Cap used</th><th>Roster</th></tr></thead>
          <tbody>{teams.map((t) => (
            <tr key={t.id} onClick={() => { window.location.hash = links.team(t.id); }} style={{ '--team': t.color }}>
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
    </section>
  );
}
