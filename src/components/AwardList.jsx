// One award on the commissioner's Awards tab: its ranked list (the top 3 are the finalists, shaded; 4 and 5 are runners
// up). Drag a row (or ▲▼) to reorder, 🔄 Replace swaps out #4 or #5 for anyone else from the season, ❓ for how the numbers
// rank it, ↺ to go back to the numbers' order. Once the finalists are confirmed only the top 3's order can change.
import React, { useState } from 'react';

// award: from AWARDS. list: [{ id, name, line, score, ... }]. edited: reordered by hand. pool: [{ id, label, entry }] to pick
// from. onChange(list, edited). onReset(). canEdit: the commissioner. locked: finalists confirmed. done: the show started.
export default function AwardList({ award, list, edited, pool, onChange, onReset, canEdit, locked, done }) {
  const [how, setHow] = useState(false), [drag, setDrag] = useState(null), [swap, setSwap] = useState(null);
  const edit = canEdit && !done, lim = locked ? Math.min(3, list.length) : list.length;   // rows that can move
  const move = (from, to) => { if (from == null || from === to || to < 0 || to >= lim || from >= lim) return; const next = [...list]; const [x] = next.splice(from, 1); next.splice(to, 0, x); onChange(next, true); };
  const replace = (n, id) => { const x = pool.find((p) => String(p.id) === id); if (x) onChange(list.map((r, k) => (k === n ? x.entry : r)), true); setSwap(null); };
  const taken = new Set(list.map((r) => String(r.id)));
  return (
    <article className="aw-card">
      <header>
        <span className="aw-icon">{award.icon}</span><b>{award.name}</b>
        <button className={`aw-how-btn${how ? ' on' : ''}`} onClick={() => setHow(!how)} title="How it's calculated">❓</button>
        {locked && <span className="aw-locked" title="Finalists confirmed">🔒</span>}
        {edited && <span className="aw-edited">Edited</span>}
        {edited && edit && !locked && <button className="btn small ghost" onClick={onReset} title="Back to the numbers' order">↺ Use the numbers</button>}
      </header>
      {how && <p className="aw-how">{award.how}</p>}
      {!list.length && <p className="dim">{award.key === 'cpoy' ? 'Nobody qualifies yet: a comeback needs a dip last season on the site. Not given this season unless you add 3.' : 'No candidates yet: this fills in as games are played.'}</p>}
      {edit && !locked && list.length > 0 && list.length < 3 && <button className="btn small ghost" onClick={() => onChange([], true)}>⊘ Don't give this award this season</button>}
      <ol className="aw-list">
        {list.map((r, n) => (
          <li key={r.id} className={`${n < 3 ? 'aw-final' : ''}${drag === n ? ' drag' : ''}${locked && n >= 3 ? ' aw-out' : ''}`} draggable={edit && n < lim}
            onDragStart={() => setDrag(n)} onDragOver={(e) => e.preventDefault()} onDrop={() => { move(drag, n); setDrag(null); }} onDragEnd={() => setDrag(null)}>
            <span className="aw-rank">{n + 1}</span>
            {swap === n
              ? <select className="aw-add-pick" autoFocus defaultValue="" onChange={(e) => replace(n, e.target.value)} onBlur={() => setSwap(null)}>
                  <option value="" disabled>Replace {r.name} with...</option>
                  {pool.filter((p) => !taken.has(String(p.id))).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              : <span className="aw-who"><b>{r.name}</b><small>{[r.pos, r.line].filter(Boolean).join(' · ')}</small></span>}
            {r.score != null && swap !== n && <span className="aw-score" title="The numbers' score">{r.score}</span>}
            {edit && n < lim && <span className="aw-tools">
              <button className="btn small ghost" disabled={n === 0} onClick={() => move(n, n - 1)} aria-label="Move up">▲</button>
              <button className="btn small ghost" disabled={n === lim - 1} onClick={() => move(n, n + 1)} aria-label="Move down">▼</button>
              {n >= 3 && !locked && <button className="btn small ghost" onClick={() => setSwap(swap === n ? null : n)} title={`Replace #${n + 1} with someone else`} aria-label="Replace">🔄</button>}
            </span>}
          </li>
        ))}
      </ol>
      {edit && !locked && list.length < 5 && (swap === 'add'   // a short list (few rookies, say) can fill its open spots
        ? <select className="aw-add-pick" autoFocus defaultValue="" onChange={(e) => { const x = pool.find((p) => String(p.id) === e.target.value); if (x) onChange([...list, x.entry], true); setSwap(null); }} onBlur={() => setSwap(null)}>
            <option value="" disabled>Fill spot #{list.length + 1} with...</option>
            {pool.filter((p) => !taken.has(String(p.id))).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        : <button className="btn small ghost aw-add" onClick={() => setSwap('add')}>➕ Fill spot #{list.length + 1}</button>)}
      <p className="aw-note">{locked ? (done ? 'The show has started: these are set.' : 'Finalists confirmed. #1 of the 3 wins; you can still change their order until the show starts.')
        : 'Only the top 3 (shaded) are finalists. To bring someone in, replace #4 or #5, then drag them up.'}</p>
    </article>
  );
}
