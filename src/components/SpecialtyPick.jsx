import React, { useState } from 'react';
import { pickSpecialty } from '../data/jerseys.js';

// One home game's uniform on My Team → Schedule: a dropdown (Home or one of the two alternates) while picks are open, and once
// an alternate is picked, a switch to have every fan wear that jersey's main color (whiteout, blackout, bloodbath).
// After picks lock it's a small tag if this is a specialty game.
export default function SpecialtyPick({ game, jerseys, pick, fans, open, left, season }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const alts = jerseys.filter((j) => j.slot >= 3);
  const current = alts.find((j) => j.slot === pick);
  if (!open) return current ? <span className="sp-tag">👕 {current.name}{fans ? ' · fans dressed to match' : ''}</span> : null;
  const save = async (slot, dress) => {
    setBusy(true); setErr('');
    try { await pickSpecialty(game.id, slot, season, dress); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <span className={`sp-pick${current ? ' on' : ''}`}>
      <select value={pick || ''} disabled={busy || (!current && left <= 0)} onChange={(e) => save(e.target.value ? Number(e.target.value) : null, false)} title={!current && left <= 0 ? 'You used both specialty games' : 'Specialty uniform'}>
        <option value="">👕 Home uniform</option>
        {alts.map((j) => <option key={j.slot} value={j.slot}>⭐ {j.name}</option>)}
      </select>
      {current && (
        <label className={`sp-fans${fans ? ' on' : ''}`} title="The whole crowd shows up in this jersey's main color">
          <input type="checkbox" checked={!!fans} disabled={busy} onChange={(e) => save(current.slot, e.target.checked)} />
          <i style={{ background: current.colors.jersey }} /> Every fan wears this color
        </label>
      )}
      {err && <small className="form-error">{err}</small>}
    </span>
  );
}
