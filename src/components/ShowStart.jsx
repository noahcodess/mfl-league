// The commissioner's show button under the Live tab's stage: Start the show (an early warning if it's before the set
// time, then a general one), Resume it if he left mid-show, or Replay it after. Starting tells every coach's Live tab the
// ceremony is on. The show itself is AwardShow.
import React, { useState } from 'react';
import Modal from './Modal.jsx';
import AwardShow from './AwardShow.jsx';
import { showStep } from '../data/ceremony.js';

const when = (iso) => new Date(iso).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function ShowStart({ season, state, reload }) {
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [open, setOpen] = useState(/devshow/.test(window.location.search) && import.meta.env.DEV);
  const early = !state.show_at || Date.parse(state.show_at) > Date.now();
  const start = async () => {
    setBusy(true); setErr('');
    try { await showStep(season, 'start'); await reload(); setStep(0); setOpen(true); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const finish = async () => { try { await showStep(season, 'finish'); await reload(); } catch { /* it retries next time */ } };
  return (
    <>
      <div className="cer-controls">
        {!state.started && <button className="btn" onClick={() => setStep(early ? 1 : 2)}>▶ Start the show</button>}
        {state.started && !state.finished && <button className="btn" onClick={() => setOpen(true)}>▶ Resume the show</button>}
        {state.finished && <button className="btn ghost" onClick={() => setOpen(true)}>↺ Replay the show</button>}
      </div>
      {step === 1 && (
        <Modal onClose={() => setStep(0)} className="confirm-modal">
          <h2>⏰ It's early</h2>
          <p>{state.show_at ? <>The show is set for <b>{when(state.show_at)}</b>. Start it now anyway?</> : 'No date is set for the show yet. Start it anyway?'}</p>
          <div className="confirm-actions"><button className="btn ghost" onClick={() => setStep(0)}>Wait</button><button className="btn" onClick={() => setStep(2)}>Start early</button></div>
        </Modal>
      )}
      {step === 2 && (
        <Modal onClose={() => !busy && setStep(0)} className="confirm-modal">
          <h2>🎭 Start the Season {season} Award Ceremony?</h2>
          <p>Every coach's Live tab switches to "the ceremony is happening now, join the Discord call". Share your screen in the call: the show runs full screen.</p>
          <p className="dim">The winners stay hidden from coaches until 2 minutes after you reach the end of the show.</p>
          {err && <p className="notice bad">{err}</p>}
          <div className="confirm-actions"><button className="btn ghost" disabled={busy} onClick={() => setStep(0)}>Cancel</button><button className="btn" disabled={busy} onClick={start}>{busy ? 'Starting...' : 'Start the show'}</button></div>
        </Modal>
      )}
      {open && state.winners && <AwardShow season={season} state={state} onFinish={finish} onExit={() => { setOpen(false); reload(); }} />}
    </>
  );
}
