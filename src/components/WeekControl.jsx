import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import Modal from './Modal.jsx';
import { advanceWeek } from '../data/weeks.js';
import { currentPhase, currentSeason, currentWeek } from '../data/teams.js';
import { useSeasonGames } from '../data/games.js';
import { simGameNow } from '../data/gameResults.js';
import { weekNow } from '../data/liveSeason.js';
import { inSandbox } from '../data/sandbox.js';
import { useCeremony } from '../data/ceremony.js';

// Commissioner's Desk → Season: the current game week and "Go to next week". Moving on also runs the bots' weekly moves.
export default function WeekControl({ canControl, reload }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(''), [simming, setSimming] = useState(null), [mustLock, setMustLock] = useState(false);
  const games = useSeasonGames(currentSeason()), inSeason = currentPhase() === 'regular_season', wk = weekNow(games), cer = useCeremony(currentSeason());
  const left = (games || []).filter((g) => g.kind === 'regular' && g.week <= wk && g.status !== 'final');   // this week's unplayed games
  const needAwards = inSeason && wk >= 12 && cer && !cer.locked;   // past Week 12 only once the award finalists are confirmed
  const toAwards = inSeason && wk === 12 && currentWeek() <= 12, atAwards = inSeason && currentWeek() > 12;   // Week 12's button goes to the ceremony
  const go = async () => {   // quick-sim whatever is left this week, then move on
    setError(''); setResult(null);
    for (const [n, g] of left.entries()) {
      setSimming(`${n + 1}/${left.length}`);
      try { await simGameNow(g.id, g.home, g.away, 'auto', g); } catch (e) { setSimming(null); throw new Error(`Couldn't sim game ${n + 1}: ${e.message}`); }
    }
    setSimming(null);
    if (needAwards) { await reload?.(); setMustLock(true); return; }
    setResult(await advanceWeek()); await reload?.();
  };
  return (
    <div className="weeks">
      <section className="card week-card">
        <span className="week-label">Season {currentSeason()}</span>
        <b className="week-num">{atAwards ? '🏅 Award Ceremony' : inSeason ? `Week ${wk}` : 'Offseason'}</b>
        <p className="dim">{atAwards ? 'The regular season is over. Run the show from the Live tab. The playoffs come after the ceremony.' : inSeason
          ? 'Go to the next week any time: games this week that haven\'t been played get quick-simmed first.'
          : 'Game weeks start when the regular season begins (the last offseason step, Training camp, starts Week 1).'}</p>
        {needAwards && !left.length ? <button className="btn" disabled={!canControl} onClick={() => setMustLock(true)}>🏅 Go to award ceremony</button>
        : <ConfirmButton className="btn" label={toAwards ? '🏅 Go to award ceremony' : '⏭️ Go to next week'} disabled={!canControl || !inSeason || atAwards || !!simming} title={toAwards ? 'Finish the regular season?' : `Finish Week ${wk}?`} yes={toAwards ? 'Go to the award ceremony' : 'Go to next week'}
          text={`${inSandbox() ? '🧪 TEST mode. ' : ''}${left.length ? `${left.length} unplayed game${left.length === 1 ? '' : 's'} this week get${left.length === 1 ? 's' : ''} quick-simmed first (final results, no broadcast). ` : ''}${toAwards ? 'The Live tab turns into the Award Ceremony. ' : ''}Every coach gets a notice, and the bots make their weekly moves.`} onConfirm={go} />}
        {simming && <p className="dim">⚡ Simming this week's games: {simming}...</p>}
        {mustLock && (
          <Modal onClose={() => setMustLock(false)} className="confirm-modal">
            <h2>🔒 Confirm the finalists first</h2>
            <p>You must confirm the award finalists before going to the award ceremony.</p>
            <div className="confirm-actions"><button className="btn ghost" onClick={() => setMustLock(false)}>Close</button><a className="btn" href="#control-awards" onClick={() => setMustLock(false)}>Go to Awards</a></div>
          </Modal>
        )}
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
