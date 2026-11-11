import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { advanceWeek } from '../data/weeks.js';
import { currentPhase, currentWeek, currentSeason } from '../data/teams.js';
import { inSandbox } from '../data/sandbox.js';

// Commissioner's Desk → Season: the current game week and "Go to next week". Moving on also runs the bots' weekly moves.
export default function WeekControl({ canControl, reload }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inSeason = currentPhase() === 'regular_season';
  const go = async () => {
    setError('');
    try { setResult(await advanceWeek()); await reload?.(); } catch (e) { setError(e.message); }
  };
  return (
    <div className="weeks">
      <section className="card week-card">
        <span className="week-label">Season {currentSeason()}</span>
        <b className="week-num">{inSeason ? `Week ${currentWeek() || 1}` : 'Offseason'}</b>
        <p className="dim">{inSeason
          ? 'When every game this week is played, go to the next week.'
          : 'Game weeks start when the regular season begins (the last offseason step, Training camp, starts Week 1).'}</p>
        <ConfirmButton className="btn" label="⏭️ Go to next week" disabled={!canControl || !inSeason} title={`Finish Week ${currentWeek() || 1}?`} yes="Go to next week"
          text={`${inSandbox() ? '🧪 TEST mode. ' : ''}Every coach gets a notice, and the bots make their weekly moves.`} onConfirm={go} />
        {error && <p className="form-error">{error}</p>}
        {result && <p className="week-result">✅ Week {result.week} is here. Bots: {result.bots.blocks} on the block · {result.bots.deals} bot trade{result.bots.deals === 1 ? '' : 's'} · {result.bots.offers} offer{result.bots.offers === 1 ? '' : 's'} to coaches · {result.bots.filled} free agents signed.</p>}
      </section>
      <section className="card">
        <h3>🤖 What the bots do after every week</h3>
        <ul className="week-list">
          <li>Re-read their team and update their plan (win now, reloading, rebuilding).</li>
          <li>Sign free agents if they have holes in the lineup.</li>
          <li>Refresh their trade block. 3.5★+ players added get a league notice.</li>
          <li>Now and then, trade with another bot when both plans line up.</li>
          <li>Rarely, offer a pick for a coach's block player at a position they really need.</li>
        </ul>
        <p className="dim">Bots also do this once when trading opens in the offseason (after re-signing).</p>
      </section>
    </div>
  );
}
