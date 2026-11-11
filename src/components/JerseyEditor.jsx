import React, { useState } from 'react';
import UniformSprite from './UniformSprite.jsx';
import { PARTS, SLOT_NAMES, whereWorn } from '../data/jerseys.js';

// Edit one uniform: rename it (alternates only; Home and Away keep their names), pick a color for every part with a live preview,
// then send it (a coach's goes to the commissioner as a request; the commissioner's saves right away).
export default function JerseyEditor({ team, jersey, model, onSubmit, onClose, submitLabel, note }) {
  const [name, setName] = useState(jersey.name);
  const [colors, setColors] = useState({ ...jersey.colors });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const swatches = [...new Set([team.color, team.accent.toLowerCase() === '#ffffff' ? '#f1f3f5' : team.accent, '#f1f3f5', '#18191c', '#9aa0a8', '#d9dde2'])];
  const fixed = Boolean(SLOT_NAMES[jersey.slot]);
  const send = async () => {
    setBusy(true); setMsg('');
    try { await onSubmit(fixed ? SLOT_NAMES[jersey.slot] : name, colors); onClose(true); } catch (e) { setMsg(e.message); setBusy(false); }
  };
  return (
    <div className="jersey-editor">
      <div className="je-preview"><UniformSprite colors={colors} player={model} scale={5} /><small>{whereWorn({ slot: jersey.slot, colors })}</small></div>
      <div className="je-form">
        <label className="field"><span>Name</span>
          <input value={fixed ? SLOT_NAMES[jersey.slot] : name} disabled={fixed} maxLength={20} onChange={(e) => setName(e.target.value)} />
        </label>
        {fixed && <p className="dim je-note">Home and Away always keep their names. You can still change their colors.</p>}
        <div className="je-parts">
          {PARTS.map(([k, label]) => (
            <div key={k} className="je-part">
              <span>{label}</span>
              <input type="color" value={colors[k]} onChange={(e) => setColors((c) => ({ ...c, [k]: e.target.value }))} />
              <span className="je-swatches">{swatches.map((s) => <button key={s} title={s} style={{ background: s }} className={colors[k] === s ? 'on' : ''} onClick={() => setColors((c) => ({ ...c, [k]: s }))} />)}</span>
            </div>
          ))}
        </div>
        {note && <p className="dim je-note">{note}</p>}
        {msg && <p className="form-error">{msg}</p>}
        <div className="je-actions"><button className="btn ghost" onClick={() => onClose(false)}>Cancel</button><button className="btn" disabled={busy} onClick={send}>{submitLabel}</button></div>
      </div>
    </div>
  );
}
