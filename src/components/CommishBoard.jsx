import React, { useState } from 'react';
import StarRating from './StarRating.jsx';
import { getTeam } from '../data/teams.js';

const codes = (ids) => (ids || []).map((id) => getTeam(id)?.code || id).join(' ');

// The commissioner's secret board: every prospect left with his true potential, who scouted him and who flagged him.
// Pick for = make the pick for the team on the clock (it asks to confirm first).
export default function CommishBoard({ prospects, potentials, intel, onPickFor, canPick }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('pot');
  const pot = (p) => potentials[p.id] ?? 0;
  const rows = prospects.filter((p) => !q || `${p.name} ${p.position} ${p.college}`.toLowerCase().includes(q.toLowerCase()))
    .sort(sort === 'pot' ? (a, b) => pot(b) - pot(a) || b.stars - a.stars : (a, b) => b.stars - a.stars || pot(b) - pot(a));
  return (
    <div className="cboard">
      <div className="cboard-top">
        <b>Board · {prospects.length} left</b>
        <input className="search" placeholder="Search name, position, college" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">
          <button className={sort === 'pot' ? 'on' : ''} onClick={() => setSort('pot')}>By potential</button>
          <button className={sort === 'now' ? 'on' : ''} onClick={() => setSort('now')}>By rating now</button>
        </div>
      </div>
      <table className="ctable">
        <thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>Now</th><th>Potential</th><th>Scouted by</th><th>Flagged by</th><th /></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td><b>{p.name}</b> <small>{p.college}</small></td>
              <td>{p.position}</td>
              <td>{p.age}</td>
              <td><StarRating value={p.stars} /></td>
              <td>{potentials[p.id] != null ? <StarRating value={potentials[p.id]} elite={potentials[p.id] === 5} showNumber /> : '-'}</td>
              <td className="mono">{codes(intel.scouted[p.id])}</td>
              <td className="mono flagged">{codes(intel.flagged[p.id])}</td>
              <td>{canPick && <button className="btn small ghost" onClick={() => onPickFor(p)}>Pick for</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
