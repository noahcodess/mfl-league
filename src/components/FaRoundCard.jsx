import React, { useState } from 'react';
import Modal from './Modal.jsx';
import { runFaRound, faRound, faRounds } from '../data/freeAgency.js';
import { links } from '../lib/router.js';
import { plural } from '../lib/format.js';
import { inSandbox } from '../data/sandbox.js';

// Commissioner's Desk during free agency: run the next round (bots bid, every free agent picks), with confirm and a recap.
export default function FaRoundCard({ canControl, onDone }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const done = faRound(), total = faRounds(), next = done + 1;

  const go = async () => {
    setBusy(true); setError('');
    try { setResult(await runFaRound()); await onDone(); } catch (e) { setError(e.message); }
    setBusy(false); setConfirm(false);
  };

  return (
    <section className="card next-step fa-round-card">
      <h3>Free agency: round {Math.min(next, total)} of {total}</h3>
      <div className="fa-pips">{Array.from({ length: total }, (_, i) => <span key={i} className={i < done ? 'done' : i === done ? 'now' : ''} />)}</div>
      {next <= total ? (
        <p>Give coaches time to make offers on the <a href={links.freeAgents}>Free Agents</a> page, then run the round. Bot teams bid first,
          then every free agent with offers picks the best one he'll take. Coach signings land in your inbox to approve.</p>
      ) : (
        <p>All {total} rounds are done. When you're ready, run the next step to close free agency (bots fill their empty spots).</p>
      )}
      {result && (
        <div className="notice good">
          Round {result.round}: {plural(result.bot_signed, 'player')} signed with bot teams, {plural(result.agreed, 'deal')} waiting for you,
          {' '}{result.holdouts > 0 ? `${plural(result.holdouts, 'star')} waiting for a better offer, ` : ''}{result.no_deal} still unsigned with offers.
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
      <div className="step-actions">
        <button className="btn" disabled={!canControl || busy || next > total} onClick={() => setConfirm(true)}>Run round {Math.min(next, total)}</button>
      </div>
      {confirm && (
        <Modal onClose={() => !busy && setConfirm(false)}>
          <h2>⚠️ Run free agency round {next}?</h2>
          <p>{inSandbox() ? <span className="step-live test">🧪 TEST MODE: this resets when you leave TEST</span> : <span className="step-live real">🔴 REAL LEAGUE: this counts</span>}</p>
          <p>Bots make their offers, then players decide. Players get a little less picky every round{next === 1 ? ', and big names may wait this one out' : ''}.</p>
          <p className="dim">You can undo it right after if something looks wrong.</p>
          <div className="modal-actions">
            <button className="btn ghost" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn" disabled={busy} onClick={go}>{busy ? 'Players are deciding...' : `Yes, run round ${next}`}</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
