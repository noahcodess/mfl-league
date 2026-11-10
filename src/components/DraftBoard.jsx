import React, { useState } from 'react';
import PlayerTable from './PlayerTable.jsx';
import { FA_JERSEY } from './FaOfferModal.jsx';
import { OFFENSE, DEFENSE } from '../data/positions.js';

// The big board: everyone still available. Filter by your flags, the players you scouted, a position, or search.
// When you're on the clock, every row gets a Draft button.
export default function DraftBoard({ prospects, potentials, flags, scouted, canFlag, onFlag, onClock, onDraft, onOpen }) {
  const [view, setView] = useState('all');
  const [pos, setPos] = useState('ALL');
  const [q, setQ] = useState('');
  const shown = prospects.filter((p) => (view === 'all' || (view === 'flags' ? flags.has(p.id) : scouted.has(p.id)))
    && (pos === 'ALL' || p.position === pos) && (!q || `${p.name} ${p.college}`.toLowerCase().includes(q.toLowerCase())));
  const count = (x) => prospects.filter((p) => p.position === x).length;
  const tags = (p) => (
    <>
      {scouted.has(p.id) && <span className="offer-tag">Scouted</span>}
      {canFlag && <button className={`flag-btn${flags.has(p.id) ? ' on' : ''}`} title={flags.has(p.id) ? 'Unflag' : 'Flag him'} onClick={(e) => { e.stopPropagation(); onFlag(p.id); }}>⚑</button>}
      {onClock && <button className="btn small draft-btn" onClick={(e) => { e.stopPropagation(); onDraft(p); }}>Draft</button>}
    </>
  );
  return (
    <div className="dboard">
      <div className="dboard-top">
        {canFlag && <div className="seg">
          <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>Everyone <small>{prospects.length}</small></button>
          {canFlag && <button className={view === 'flags' ? 'on' : ''} onClick={() => setView('flags')}>⚑ Flagged <small>{prospects.filter((p) => flags.has(p.id)).length}</small></button>}
          {canFlag && <button className={view === 'scouted' ? 'on' : ''} onClick={() => setView('scouted')}>🔭 Scouted <small>{prospects.filter((p) => scouted.has(p.id)).length}</small></button>}
        </div>}
        <input className="search" placeholder="Search name or college" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="pos-chips">
        <button className={pos === 'ALL' ? 'on' : ''} onClick={() => setPos('ALL')}>All</button>
        {[...OFFENSE, ...DEFENSE].map((x) => (
          <button key={x} className={pos === x ? 'on' : ''} disabled={!count(x)} onClick={() => setPos(x)}>{x} <small>{count(x)}</small></button>
        ))}
      </div>
      {shown.length ? (
        <PlayerTable players={shown} jersey={FA_JERSEY} onOpen={onOpen} potentials={potentials} tags={tags}
          sub={(p) => `${p.college} · ${p.collegeStats?.class || 'Senior'}`} />
      ) : <p className="dim board-empty">{view === 'flags' ? 'Flag players with ⚑ to build your wish list.' : view === 'scouted' ? 'You haven\'t scouted anyone still on the board.' : 'Nobody matches.'}</p>}
    </div>
  );
}
