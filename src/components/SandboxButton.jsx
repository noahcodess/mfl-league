import React, { useState } from 'react';
import Modal from './Modal.jsx';
import { inSandbox, enterSandbox, exitSandbox } from '../data/sandbox.js';

// The TEST mode switch (only in Commissioner's Desk → Test), with a warning before turning it on or off.
export default function SandboxButton({ onChanged, label }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const on = inSandbox();
  const go = async () => {
    setBusy(true); setError('');
    try { await (on ? exitSandbox() : enterSandbox()); await onChanged?.(); setConfirm(false); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  return (
    <>
      <button className={`btn small test-btn${on ? ' on' : ''}`} onClick={() => setConfirm(true)} title={on ? 'Leave TEST mode and reset the league' : 'Try things without touching the real league'}>
        {label || (on ? 'EXIT TEST' : 'TEST')}
      </button>
      {confirm && (
        <Modal onClose={() => !busy && setConfirm(false)}>
          <h2>{on ? '⚠️ Leave TEST mode?' : '🧪 Turn on TEST mode?'}</h2>
          {on ? (
            <p>Everything done in TEST mode is wiped and the league goes back exactly to how it was when TEST started: steps, signings, drafts, scouting, the league log, all of it.</p>
          ) : (
            <p>The league is saved, the whole site turns green with a TEST banner, and you can run steps, free agency rounds and anything else for real. When you leave TEST mode, everything resets to right now.</p>
          )}
          <p className="dim">Coaches see the green TEST banner too, so nobody mistakes it for the real league. Accounts and logins aren't part of the reset.</p>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button className="btn ghost" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn" disabled={busy} onClick={go}>{busy ? 'Working...' : on ? 'Yes, reset the league' : 'Yes, start TEST mode'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
