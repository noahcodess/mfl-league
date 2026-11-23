import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { advanceWeek } from '../data/weeks.js';
import { currentPhase, currentSeason } from '../data/teams.js';
import { useSeasonGames } from '../data/games.js';
import { simGameNow } from '../data/gameResults.js';
import { weekNow } from '../data/liveSeason.js';
import { inSandbox } from '../data/sandbox.js';
import { useCeremony } from '../data/ceremony.js';

// Commissioner's Desk → Season: the current game week and "Go to next week". Moving on also runs the bots' weekly moves.
export default function WeekControl({ canControl, reload }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(''), [simming, setSimming] = useState(null);
  const games = useSeasonGames(currentSeason()), inSeason = currentPhase() === 'regular_season', wk = weekNow(games), cer = useCeremony(currentSeason());
  const left = (games || []).filter((g) => g.kind === 'regular' && g.week <= wk && g.status !== 'final');   // this week's unplayed games
  const needAwards = inSeason && wk >= 12 && cer && !cer.locked;   // past Week 12 only once the award finalists are confirmed
  const go = async () => {   // quick-sim whatever is left this week, then move on
    setError(''); setResult(null);
    for (const [n, g] of left.entries()) {
      setSimming(`${n + 1}/${left.length}`);
      try { await simGameNow(g.id, g.home, g.away, 'auto', g); } catch (e) { setSimming(null); throw new Error(`Couldn't sim game ${n + 1}: ${e.message}`); }
    }
    setSimming(null);
    if (needAwards) { await reload?.(); setError('Week 12 is played. Confirm the award finalists (Awards tab), then come back to go on.'); return; }
    setResult(await advanceWeek()); await reload?.();
  };
  return (
    <div className="weeks">
      <section className="card week-card">
        <span className="week-label">Season {currentSeason()}</span>
        <b className="week-num">{inSeason ? `Week ${wk}` : 'Offseason'}</b>
        <p className="dim">{inSeason
          ? 'Go to the next week any time: games this week that haven\'t been played get quick-simmed first.'
          : 'Game weeks start when the regular season begins (the last offseason step, Training camp, starts Week 1).'}</p>
        <ConfirmButton className="btn" label="⏭️ Go to next week" disabled={!canControl || !inSeason || !!simming || (needAwards && !left.length)} title={`Finish Week ${wk}?`} yes="Go to next week"
          text={`${inSandbox() ? '🧪 TEST mode. ' : ''}${left.length ? `${left.length} unplayed game${left.length === 1 ? '' : 's'} this week get${left.length === 1 ? 's' : ''} quick-simmed first (final results, no broadcast). ` : ''}Every coach gets a notice, and the bots make their weekly moves.`} onConfirm={go} />
        {simming && <p className="dim">⚡ Simming this week's games: {simming}...</p>}
        {needAwards && <p className="aw-cer-warn">🏅 Before going past Week 12, confirm the award finalists: <a href="#control-awards">Commissioner's Desk → Awards</a>.</p>}
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
