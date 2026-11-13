import React, { useState } from 'react';
import Modal from './Modal.jsx';

const TEN_MIN = 10 * 60e3;

// Commissioner: Start game. Green within 10 minutes of kickoff; gray before that or with no kickoff time (still clickable).
// A gray start asks first ("league mates won't know"), then every start asks "are you sure?".
export default function StartGameButton({ startsAt, now, onStart }) {
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const at = startsAt ? Date.parse(startsAt) : null, ready = at && at - now <= TEN_MIN;
  const go = async () => { setBusy(true); setErr(''); try { await onStart(); setStep(0); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <>
      <button className={`btn gp-start ${ready ? 'ready' : 'early'}`} onClick={() => setStep(ready ? 2 : 1)}>▶ Start game</button>
      {step === 1 && (
        <Modal onClose={() => setStep(0)} className="confirm-modal">
          <h2>⚠️ Start the game early?</h2>
          <p>{at ? "You're more than 10 minutes away from the start time." : "This game doesn't have a start time yet."} Your league mates may not know the game is on.
            {at ? '' : ' Set a start time in Commissioner’s Desk → Schedule so everyone gets a countdown.'}</p>
          <div className="confirm-actions"><button className="btn ghost" onClick={() => setStep(0)}>Cancel</button><button className="btn" onClick={() => setStep(2)}>Start anyway</button></div>
        </Modal>
      )}
      {step === 2 && (
        <Modal onClose={() => !busy && setStep(0)} className="confirm-modal">
          <h2>⚠️ Start the game?</h2>
          <p>Are you sure you'd like to start the game? The intro plays and the game goes live in both coaching rooms.</p>
          {err && <p className="notice bad">{err}</p>}
          <div className="confirm-actions"><button className="btn ghost" disabled={busy} onClick={() => setStep(0)}>Cancel</button><button className="btn" disabled={busy} onClick={go}>{busy ? 'Starting...' : 'Start the game'}</button></div>
        </Modal>
      )}
    </>
  );
}
