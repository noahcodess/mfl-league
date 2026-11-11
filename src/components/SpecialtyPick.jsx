import React, { useState } from 'react';
import { pickSpecialty } from '../data/jerseys.js';

// One home game's uniform on My Team → Schedule: a dropdown (Home or one of the two alternates) while picks are open,
// otherwise a small tag if this is a specialty game.
export default function SpecialtyPick({ game, jerseys, pick, open, left, season }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const alts = jerseys.filter((j) => j.slot >= 3);
  const current = alts.find((j) => j.slot === pick);
  if (!open) return current ? <span className="sp-tag">👕 {current.name}</span> : null;
  const change = async (e) => {
    const v = e.target.value ? Number(e.target.value) : null;
    setBusy(true); setErr('');
    try { await pickSpecialty(game.id, v, season); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <span className={`sp-pick${current ? ' on' : ''}`}>
      <select value={pick || ''} disabled={busy || (!current && left <= 0)} onChange={change} title={!current && left <= 0 ? 'You used both specialty games' : 'Specialty uniform'}>
        <option value="">👕 Home uniform</option>
        {alts.map((j) => <option key={j.slot} value={j.slot}>⭐ {j.name}</option>)}
      </select>
      {err && <small className="form-error">{err}</small>}
    </span>
  );
}
