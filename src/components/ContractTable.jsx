import React, { useState } from 'react';
import MoodTag from './MoodTag.jsx';
import { capHit } from '../data/players.js';
import { money } from '../lib/format.js';

// Every contract on the roster, sortable by the column headers.
const COLS = [
  ['name', 'Player', (p) => p.name],
  ['position', 'Pos', (p) => p.position],
  ['depth', 'Role', (p) => p.depth],
  ['age', 'Age', (p) => p.age ?? -1],
  ['years', 'Years', (p) => p.contract?.years ?? -1],
  ['total', 'Total', (p) => p.contract?.total ?? -1],
  ['hit', 'Per year', (p) => capHit(p)],
  ['mood', 'Mood', (p) => p.mood || ''],
];

export default function ContractTable({ players }) {
  const [sort, setSort] = useState({ key: 'hit', dir: -1 });
  const get = COLS.find((c) => c[0] === sort.key)[2];
  const rows = [...players].sort((a, b) => (get(a) > get(b) ? 1 : get(a) < get(b) ? -1 : 0) * sort.dir);
  const click = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));
  return (
    <section className="card">
      <h3>Contracts</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr>{COLS.map(([k, label]) => (
            <th key={k} onClick={() => click(k)} className={sort.key === k ? 'sorted' : ''}>{label}</th>
          ))}</tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id} className={p.notes.length ? 'flag' : ''} title={p.notes.join('\n')}>
              <td>{p.name}</td><td>{p.position}</td><td className="dim">{p.depth === 'starter' ? 'Starter' : 'Backup'}</td>
              <td>{p.age ?? '-'}</td><td>{p.contract ? `${p.contract.years}Y` : '-'}</td>
              <td>{money(p.contract?.total)}</td><td><strong>{p.contract ? money(capHit(p)) : '-'}</strong></td>
              <td><MoodTag mood={p.mood} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
