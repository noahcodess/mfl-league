import React, { useMemo, useState } from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { heightLabel } from '../lib/format.js';

// A compact, sortable list of players (draft board, free agents): one clean row each instead of big cards.
// sub(p) gives the small line under the name; tags(p) gives badges on the right; potentials shows POT when known.
// Starting order: ranks (id -> number, the draft board) if given; shuffle starts in a new random order each visit (free
// agents, so the order never hints at who's good); otherwise best rating first. Tap # to go back to the starting order.
const SORTS = {
  stars: (a, b) => b.stars - a.stars || a.age - b.age,
  age: (a, b) => a.age - b.age || b.stars - a.stars,
  name: (a, b) => a.name.localeCompare(b.name),
  pos: (a, b) => a.position.localeCompare(b.position) || b.stars - a.stars,
};

export default function PlayerTable({ players, jersey, onOpen, sub, tags, potentials, ranks = null, shuffle = false, first = 40 }) {
  const [sort, setSort] = useState('start');
  const [limit, setLimit] = useState(first);
  const [salt] = useState(() => Math.random().toString(36).slice(2));
  const mix = useMemo(() => {
    const key = (id) => {   // FNV-1a, then a full avalanche so every visit's order is really different
      let h = 2166136261; for (const c of `${salt}${id}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
      h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0;
    };
    return (a, b) => key(a.id) - key(b.id);
  }, [salt]);
  const seesPot = potentials && players.some((p) => potentials[p.id] != null);
  const bySort = sort === 'pot' ? (a, b) => (potentials[b.id] ?? 0) - (potentials[a.id] ?? 0) || b.stars - a.stars
    : sort === 'start' ? (ranks ? (a, b) => (ranks[a.id] ?? 999) - (ranks[b.id] ?? 999) : shuffle ? mix : SORTS.stars) : SORTS[sort];
  const rows = [...players].sort(bySort);
  const th = (key, label, cls = '') => <th className={`${cls}${sort === key ? ' sorted' : ''}`} onClick={() => setSort(key)}>{label}{sort === key ? ' ▾' : ''}</th>;
  return (
    <div className="ptable-wrap">
      <table className="ptable">
        <thead><tr>
          <th className={`rank${sort === 'start' ? ' sorted' : ''}`} onClick={() => setSort('start')} title={ranks ? 'Draft board order' : shuffle ? 'Shuffled order' : 'Best first'}>#</th>
          {th('name', 'Player')}{th('pos', 'Pos')}{th('age', 'Age', 'hide-sm')}
          <th className="hide-sm">Size</th>{th('stars', 'Now')}{seesPot && th('pot', 'Potential')}<th />
        </tr></thead>
        <tbody>
          {rows.slice(0, limit).map((p, i) => (
            <tr key={p.id} onClick={() => onOpen(p)}>
              <td className="rank">{ranks?.[p.id] ?? i + 1}</td>
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
