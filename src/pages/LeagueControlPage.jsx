import React, { useEffect, useState } from 'react';
import OffseasonSteps, { OFFSEASON_STEPS } from '../components/OffseasonSteps.jsx';
import LeagueLog from '../components/LeagueLog.jsx';
import Modal from '../components/Modal.jsx';
import DealInbox from '../components/DealInbox.jsx';
import FaRoundCard from '../components/FaRoundCard.jsx';
import { useNegotiations } from '../data/negotiations.js';
import { currentSeason, currentPhase, offseasonStep, leagueEvents, PHASE_NAMES, FA_WINDOW } from '../data/teams.js';
import { inSandbox } from '../data/sandbox.js';
import { advanceOffseason, undoLastStep, lastSnapshotLabel } from '../data/leagueEngine.js';
import { previewStep } from '../lib/stepPreview.js';

// Commissioner's calendar: see what the next step will do, run it (after confirming), or undo the last one.
export default function LeagueControlPage({ canControl, reload, viewerKey }) {
  const [confirm, setConfirm] = useState(null); // 'run' | 'undo'
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [undoLabel, setUndoLabel] = useState(null);
  const [version, setVersion] = useState(0);
  const negotiations = useNegotiations(viewerKey, version);
  const phase = currentPhase(), step = offseasonStep();
  const inOffseason = phase === 'offseason';
  const [name, help] = OFFSEASON_STEPS[step] || [];
  const preview = previewStep(step);

  useEffect(() => { if (canControl) lastSnapshotLabel().then(setUndoLabel); }, [canControl, step, phase]);

  const go = async () => {
    setBusy(true);
    try {
      const r = confirm === 'run' ? await advanceOffseason() : await undoLastStep();
      setNote({ ok: true, text: confirm === 'run' ? `${r.step} done (${r.affected} affected).` : `Undone: ${r.undone}.` });
      await reload();
    } catch (e) {
      setNote({ ok: false, text: e.message });
    }
    setBusy(false);
    setConfirm(null);
  };

  return (
    <div>
      <div className="console-head">
        <div><h1>League Control</h1><div className="dim">Season {currentSeason()} · {PHASE_NAMES[phase]}. You set the pace; the league does the rest.</div></div>
      </div>
      {!canControl && <div className="notice">View only. The commissioner runs these steps with his key.</div>}
      {note && <div className={`notice ${note.ok ? 'good' : 'bad'}`}>{note.text}</div>}
      <div className="two-col wide-left">
        <div>
          {inOffseason && step === FA_WINDOW && <FaRoundCard canControl={canControl} onDone={async () => { setVersion((v) => v + 1); await reload(); }} />}
          {inOffseason ? (
            <section className="card next-step">
              <h3>Up next: {name}</h3>
              <p>{help}</p>
              <p className="preview">{preview.text}</p>
              {preview.list.length > 0 && (
                <details className="preview-list"><summary>See all {preview.list.length}</summary>
                  <ul>{preview.list.map((p) => <li key={p.id}>{p.name} <span className="dim">· {p.position} · age {p.age}</span></li>)}</ul>
                </details>
              )}
              <div className="step-actions">
                <button className={`btn${step === FA_WINDOW ? ' ghost' : ''}`} disabled={!canControl || busy} onClick={() => setConfirm('run')}>{step === FA_WINDOW ? 'Close free agency and run the Draft' : `Run ${name}`}</button>
                {undoLabel && <button className="btn ghost" disabled={!canControl || busy} onClick={() => setConfirm('undo')}>Undo last step</button>}
              </div>
              {undoLabel && <p className="dim help">Undo puts the league back to: {undoLabel.toLowerCase()}.</p>}
            </section>
          ) : (
            <section className="card next-step">
              <h3>{PHASE_NAMES[phase]}</h3>
              <p className="dim">The schedule and game weeks plug in here next.</p>
              {undoLabel && <button className="btn ghost" disabled={!canControl || busy} onClick={() => setConfirm('undo')}>Undo last step</button>}
            </section>
          )}
          <DealInbox negotiations={negotiations} canControl={canControl} onDone={async () => { setVersion((v) => v + 1); await reload(); }} />
          <LeagueLog events={leagueEvents()} />
        </div>
        <OffseasonSteps current={inOffseason ? step : OFFSEASON_STEPS.length + 1} title="Offseason calendar" />
      </div>
      {confirm && (
        <Modal onClose={() => !busy && setConfirm(null)}>
          <h2>⚠️ {confirm === 'run' ? `Move the league to ${name}?` : 'Undo the last step?'}</h2>
          <p>{inSandbox() ? <span className="step-live test">🧪 TEST MODE: this resets when you leave TEST</span> : <span className="step-live real">🔴 REAL LEAGUE: this counts</span>}</p>
          <p>{confirm === 'run' ? preview.text : `This puts the league back to: ${undoLabel?.toLowerCase()}.`}</p>
          <p className="dim">{confirm === 'run' ? 'Every coach sees the change right away. You can undo it right after if something looks wrong.' : 'Anything that happened since that step is reversed.'}</p>
          <div className="modal-actions">
            <button className="btn ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn" disabled={busy} onClick={go}>{busy ? 'Working...' : confirm === 'run' ? `Yes, run ${name}` : 'Yes, undo'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
