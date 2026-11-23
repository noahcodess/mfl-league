// One award on the commissioner's Awards tab: its ranked list (the top 3 are the finalists, shaded; 4 and 5 are runners
// up), drag a row to reorder, ✕ to drop one, ➕ to add anyone from the season, ❓ for how the numbers rank it, and ↺ to go
// back to the numbers' order. Every change saves right away.
import React, { useState } from 'react';

const MAX = 8;
// award: from AWARDS. list: [{ id, name, line, score, ... }]. edited: reordered by hand. pool: [{ id, label, entry }] to add
// from. onChange(list, edited). onReset(). canEdit: the commissioner.
export default function AwardList({ award, list, edited, pool, onChange, onReset, canEdit }) {
  const [how, setHow] = useState(false), [drag, setDrag] = useState(null), [adding, setAdding] = useState(false);
  const move = (from, to) => { if (from === to || to < 0 || to >= list.length) return; const next = [...list]; const [x] = next.splice(from, 1); next.splice(to, 0, x); onChange(next, true); };
  const taken = new Set(list.map((r) => String(r.id)));
  return (
    <article className="aw-card">
      <header>
        <span className="aw-icon">{award.icon}</span><b>{award.name}</b>
        <button className={`aw-how-btn${how ? ' on' : ''}`} onClick={() => setHow(!how)} title="How it's calculated">❓</button>
        {edited && <span className="aw-edited">Edited</span>}
        {edited && canEdit && <button className="btn small ghost" onClick={onReset} title="Back to the numbers' order">↺ Use the numbers</button>}
      </header>
      {how && <p className="aw-how">{award.how}</p>}
      {!list.length && <p className="dim">No candidates yet: this fills in as games are played.</p>}
      <ol className="aw-list">
        {list.map((r, n) => (
          <li key={r.id} className={`${n < 3 ? 'aw-final' : ''}${drag === n ? ' drag' : ''}`} draggable={canEdit}
            onDragStart={() => setDrag(n)} onDragOver={(e) => e.preventDefault()} onDrop={() => { move(drag, n); setDrag(null); }} onDragEnd={() => setDrag(null)}>
            <span className="aw-rank">{n + 1}</span>
            <span className="aw-who"><b>{r.name}</b><small>{[r.pos, r.line].filter(Boolean).join(' · ')}</small></span>
            {r.score != null && <span className="aw-score" title="The numbers' score">{r.score}</span>}
            {canEdit && <span className="aw-tools">
              <button className="btn small ghost" disabled={n === 0} onClick={() => move(n, n - 1)} aria-label="Move up">▲</button>
              <button className="btn small ghost" disabled={n === list.length - 1} onClick={() => move(n, n + 1)} aria-label="Move down">▼</button>
              <button className="btn small ghost" onClick={() => onChange(list.filter((_, k) => k !== n), true)} aria-label="Remove">✕</button>
            </span>}
          </li>
        ))}
      </ol>
      {list.length > 3 && <p className="aw-note">Only the top 3 (shaded) are finalists and get shown.</p>}
      {canEdit && list.length < MAX && (adding
        ? <select className="aw-add-pick" autoFocus defaultValue="" onChange={(e) => { const x = pool.find((p) => String(p.id) === e.target.value); if (x) onChange([...list, x.entry], true); setAdding(false); }} onBlur={() => setAdding(false)}>
            <option value="" disabled>Pick one to add...</option>
            {pool.filter((p) => !taken.has(String(p.id))).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        : <button className="btn small ghost aw-add" onClick={() => setAdding(true)}>➕ Add</button>)}
    </article>
  );
}
