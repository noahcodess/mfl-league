import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { FA_JERSEY } from './FaOfferModal.jsx';

// The commissioner searches the board and makes the pick for the team on the clock (with one more "are you sure").
export default function CommishPickModal({ team, prospects, onPick, onClose }) {
  const [q, setQ] = useState('');
  const [sure, setSure] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const hits = prospects.filter((p) => `${p.name} ${p.position} ${p.college}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.stars - a.stars).slice(0, 30);
  const go = async () => {
    setBusy(true); setErr('');
    try { await onPick(sure); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal onClose={onClose} className="pick-for">
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <h2>Pick for the {team?.name}</h2>
      {!sure ? (
        <>
          <input className="search" autoFocus placeholder="Search a name, position or college" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="pick-list">
            {hits.map((p) => (
              <li key={p.id} onClick={() => setSure(p)}>
                <Headshot player={p} team={FA_JERSEY} size={36} />
                <span><b>{p.name}</b><small>{p.position} · {p.college}</small></span>
                <StarRating value={p.stars} />
              </li>
            ))}
            {!hits.length && <li className="dim">Nobody matches that.</li>}
          </ul>
        </>
      ) : (
        <div className="pick-sure">
          <Headshot player={sure} team={team} size={96} />
          <p>Draft <b>{sure.name}</b> ({sure.position}, {sure.college}) for the {team?.name}?</p>
          {err && <p className="notice bad">{err}</p>}
          <div className="confirm-actions">
            <button className="btn ghost" disabled={busy} onClick={() => setSure(null)}>Back</button>
            <button className="btn" disabled={busy} onClick={go}>{busy ? 'Sending...' : 'Yes, make the pick'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
