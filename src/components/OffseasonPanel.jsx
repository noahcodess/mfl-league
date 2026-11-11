import React, { useEffect, useState } from 'react';
import OffseasonSteps, { OFFSEASON_STEPS } from './OffseasonSteps.jsx';
import LeagueLog from './LeagueLog.jsx';
import Modal from './Modal.jsx';
import DealInbox from './DealInbox.jsx';
import FaRoundCard from './FaRoundCard.jsx';
import { useNegotiations } from '../data/negotiations.js';
import { currentPhase, offseasonStep, leagueEvents, PHASE_NAMES, FA_WINDOW } from '../data/teams.js';
import { inSandbox } from '../data/sandbox.js';
import { advanceOffseason, undoLastStep, lastSnapshotLabel } from '../data/leagueEngine.js';
import { previewStep } from '../lib/stepPreview.js';
import Tabs from './Tabs.jsx';
import DraftSettings from './DraftSettings.jsx';
import LeagueRules from './LeagueRules.jsx';
import { links } from '../lib/router.js';

// Commissioner's Desk → Offseason: the next step (preview, run or undo), deals waiting for approval, the league log,
// the offseason calendar, and the draft settings.
export default function OffseasonPanel({ canControl, reload, viewerKey }) {
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
      {note && <div className={`notice ${note.ok ? 'good' : 'bad'}`}>{note.text}</div>}
      <Tabs tabs={[
        { key: 'steps', label: 'Steps', render: () => (
          <div className="two-col wide-left">
            <div>
              {inOffseason && step === FA_WINDOW && <FaRoundCard canControl={canControl} onDone={async () => { setVersion((v) => v + 1); await reload(); }} />}
              {inOffseason ? (
                <section className="card next-step">
                  <h3>Up next: {name}</h3>
                  <p>{help}</p>
                  <p className="preview">{preview.text}</p>
              {step === FA_WINDOW && <p><a className="btn" href={links.draft}>🏈 Go to the draft room to start the draft</a></p>}
                  {preview.list.length > 0 && (
                    <details className="preview-list"><summary>See all {preview.list.length}</summary>
                      <ul>{preview.list.map((p) => <li key={p.id}>{p.name} <span className="dim">· {p.position} · age {p.age}</span></li>)}</ul>
                    </details>
                  )}
                  <div className="step-actions">
                    <button className={`btn${step === FA_WINDOW ? ' ghost' : ''}`} disabled={!canControl || busy} onClick={() => setConfirm('run')}>{step === FA_WINDOW ? 'Close free agency (finishes any picks left)' : `Run ${name}`}</button>
                    {undoLabel && <button className="btn ghost" disabled={!canControl || busy} onClick={() => setConfirm('undo')}>Undo last step</button>}
                  </div>
                  {undoLabel && <p className="dim help">Undo puts the league back to: {undoLabel.toLowerCase()}.</p>}
                </section>
              ) : (
                <section className="card next-step">
                  <h3>{PHASE_NAMES[phase]}</h3>
                  <p className="dim">The offseason is over. Game weeks run from the Season tab.</p>
                  {undoLabel && <button className="btn ghost" disabled={!canControl || busy} onClick={() => setConfirm('undo')}>Undo last step</button>}
                </section>
              )}
              <DealInbox negotiations={negotiations} canControl={canControl} onDone={async () => { setVersion((v) => v + 1); await reload(); }} />
              <LeagueLog events={leagueEvents()} />
            </div>
            <OffseasonSteps current={inOffseason ? step : OFFSEASON_STEPS.length + 1} title="Offseason calendar" />
          </div>
        ) },
        { key: 'draft', label: 'Draft settings', render: () => <DraftSettings canControl={canControl} /> },
        { key: 'rules', label: 'League rules', render: () => <LeagueRules canControl={canControl} /> },
      ]} />
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
