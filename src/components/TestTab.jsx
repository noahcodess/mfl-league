import React, { useState } from 'react';
import SandboxButton from './SandboxButton.jsx';
import TestSimLoading from './TestSimLoading.jsx';
import { inSandbox } from '../data/sandbox.js';
import { simToSeason } from '../data/testSim.js';
import { currentPhase, offseasonStep, PHASE_NAMES } from '../data/teams.js';

// Commissioner's Desk → Test: the only place to start or leave TEST mode. Test from right here, or sim straight to Week 1
// (TEST turns on by itself). Everything done in TEST resets when you leave it.
export default function TestTab({ canControl, reload }) {
  const [log, setLog] = useState(null);
  const [error, setError] = useState('');
  const on = inSandbox(), offseason = currentPhase() === 'offseason';
  const sim = async () => {
    setError(''); setLog([]);
    try {
      await simToSeason((text) => setLog((l) => [...(l || []), text]));
      setLog((l) => [...l, 'Reloading the league']);
      await reload();
      setLog(null);
    } catch (e) { setError(e.message); await reload(); }
  };
  return (
    <div className="test-tab">
      <section className={`card test-status${on ? ' on' : ''}`}>
        <h3>{on ? '🧪 TEST mode is on' : '🔴 Real league'}</h3>
        <p>{on ? 'Everything you do now is a test. Leaving TEST mode puts the league back exactly how it was when the test started.' : 'Nothing is being tested. Changes count for real.'}</p>
        <p className="dim">Right now: {PHASE_NAMES[currentPhase()]}{offseason ? `, offseason step ${offseasonStep() + 1} of 5` : ''}.</p>
        {canControl && on && <SandboxButton onChanged={reload} label="Leave TEST mode (resets the league)" />}
      </section>
      <div className="test-options">
        <section className="card">
          <h3>▶️ Test from this point</h3>
          <p>Turn TEST mode on with the league exactly as it is, then run steps, free agency, the draft or game weeks yourself from the other tabs.</p>
          {on ? <p className="num-ok">✅ Already testing.</p> : canControl && <SandboxButton onChanged={reload} label="▶️ Start testing here" />}
        </section>
        <section className="card">
          <h3>⏩ Test to season</h3>
          <p>Sims the rest of the offseason for you: every step, all free agency rounds, the whole draft, then makes the schedule (best games in primetime) and starts Week 1.</p>
          <p className="dim">TEST mode turns on by itself, so the real league is saved and comes back when you leave TEST.</p>
          <button className="btn" disabled={!canControl || !offseason || log !== null} onClick={sim}>⏩ Sim to Week 1</button>
          {!offseason && <p className="dim">The league is already in the {PHASE_NAMES[currentPhase()].toLowerCase()}.</p>}
        </section>
      </div>
      {log !== null && <TestSimLoading log={log} error={error} onClose={() => { setLog(null); setError(''); }} />}
    </div>
  );
}
