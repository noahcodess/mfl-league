import React, { useState } from 'react';
import Modal from './Modal.jsx';

// A button that asks "are you sure?" first. Used for every big commissioner move.
export default function ConfirmButton({ label, title, text, yes = 'Yes, do it', onConfirm, className = 'btn', disabled }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try { await onConfirm(); setOpen(false); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <button className={className} disabled={disabled} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <Modal onClose={() => !busy && setOpen(false)} className="confirm-modal">
          <h2>⚠️ {title}</h2>
          {text && <p>{text}</p>}
          {err && <p className="notice bad">{err}</p>}
          <div className="confirm-actions">
            <button className="btn ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn" disabled={busy} onClick={go}>{busy ? 'Working...' : yes}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
