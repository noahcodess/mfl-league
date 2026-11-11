import React, { useState } from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { heightLabel } from '../lib/format.js';

// A compact, sortable list of players (draft board, free agents): one clean row each instead of big cards.
// sub(p) gives the small line under the name; tags(p) gives badges on the right; potentials shows POT when known.
const SORTS = {
  stars: (a, b) => b.stars - a.stars || a.age - b.age,
  age: (a, b) => a.age - b.age || b.stars - a.stars,
  name: (a, b) => a.name.localeCompare(b.name),
  pos: (a, b) => a.position.localeCompare(b.position) || b.stars - a.stars,
};

export default function PlayerTable({ players, jersey, onOpen, sub, tags, potentials, first = 40 }) {
  const [sort, setSort] = useState('stars');
  const [limit, setLimit] = useState(first);
  const seesPot = potentials && players.some((p) => potentials[p.id] != null);
  const bySort = sort === 'pot'
    ? (a, b) => (potentials[b.id] ?? 0) - (potentials[a.id] ?? 0) || b.stars - a.stars
    : SORTS[sort];
  const rows = [...players].sort(bySort);
  const th = (key, label, cls = '') => <th className={`${cls}${sort === key ? ' sorted' : ''}`} onClick={() => setSort(key)}>{label}{sort === key ? ' ▾' : ''}</th>;
  return (
    <div className="ptable-wrap">
      <table className="ptable">
        <thead><tr>
          <th className="rank">#</th>{th('name', 'Player')}{th('pos', 'Pos')}{th('age', 'Age', 'hide-sm')}
          <th className="hide-sm">Size</th>{th('stars', 'Now')}{seesPot && th('pot', 'Potential')}<th />
        </tr></thead>
        <tbody>
          {rows.slice(0, limit).map((p, i) => (
            <tr key={p.id} onClick={() => onOpen(p)}>
              <td className="rank">{i + 1}</td>
              <td><div className="who-cell"><Headshot player={p} team={jersey} size={36} /><span><b>{p.name}</b><small>{sub?.(p)}</small></span></div></td>
              <td className="pos-cell">{p.position}</td>
              <td className="hide-sm">{p.age}</td>
              <td className="hide-sm dim">{heightLabel(p.height)}{p.weight ? `, ${p.weight}` : ''}</td>
              <td><StarRating value={p.stars} elite={p.elite} peak={p.peakStars} /></td>
              {seesPot && <td>{potentials[p.id] != null ? <StarRating value={potentials[p.id]} elite={potentials[p.id] === 5} /> : <span className="dim">?</span>}</td>}
              <td><div className="tags">{tags?.(p)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > limit && <button className="show-more" onClick={() => setLimit(rows.length)}>Show all ({rows.length})</button>}
    </div>
  );
}
