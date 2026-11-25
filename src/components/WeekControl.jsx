import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import Modal from './Modal.jsx';
import { advanceWeek, advancePlayoffs, savedWeek } from '../data/weeks.js';
import { currentPhase, currentSeason, currentWeek, getTeams } from '../data/teams.js';
import { useSeasonGames } from '../data/games.js';
import { simGameNow } from '../data/gameResults.js';
import { weekNow, useLiveSeason } from '../data/liveSeason.js';
import { records } from '../lib/seasonStats.js';
import { playoffSeeds } from '../lib/playoffSeeds.js';
import { roundOfWeek } from '../lib/playoffRounds.js';
import { inSandbox } from '../data/sandbox.js';
import { useCeremony } from '../data/ceremony.js';

// Commissioner's Desk → Season: the current game week and "Go to next week". Moving on also runs the bots' weekly moves.
// After the award ceremony it moves the playoffs round by round (Quarterfinals, Semifinals, Craft Bowl), quick-simming any
// game left in the round first. Nothing comes after the Craft Bowl yet.
export default function WeekControl({ canControl, reload }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(''), [simming, setSimming] = useState(null), [mustLock, setMustLock] = useState(false);
  const games = useSeasonGames(currentSeason()), inSeason = currentPhase() === 'regular_season', wk = weekNow(games), cer = useCeremony(currentSeason());
  const season = useLiveSeason(), cw = currentWeek(), round = inSeason ? roundOfWeek(cw) : null, nextRound = inSeason ? roundOfWeek(cw + 1) : null;
  const inPlayoffs = !!round || (inSeason && cw === 13);
  const left = inPlayoffs ? (games || []).filter((g) => round && g.kind === round.kind && g.status !== 'final')   // this round's unplayed games
    : (games || []).filter((g) => g.kind === 'regular' && g.week <= wk && g.status !== 'final');   // this week's unplayed games
  const needAwards = inSeason && wk >= 12 && cer && !cer.locked;   // past Week 12 only once the award finalists are confirmed
  const toAwards = inSeason && wk === 12 && cw <= 12, atAwards = inSeason && cw === 13;   // Week 12's button goes to the ceremony
  const seasonOver = inSeason && cw >= 16;   // Craft Bowl week: nothing to move on to yet
  const goPlayoffs = async () => {   // the next round: finish this one, then set the next
    setError(''); setResult(null);
    const real = await savedWeek();
    if (real != null && real !== cw) { await reload?.(); throw new Error(`The league moved on in another window (now Week ${real}). Check it, then go again.`); }
    for (const [n, g] of left.entries()) {
      setSimming(`${n + 1}/${left.length}`);
      try { await simGameNow(g.id, g.home, g.away, 'auto', g); } catch (e) { setSimming(null); throw new Error(`Couldn't sim game ${n + 1}: ${e.message}`); }
    }
    setSimming(null);
    const seeds = cw === 13 ? Object.fromEntries(Object.entries(playoffSeeds(getTeams(), records(season.weeks))).map(([c, l]) => [c, l.map((x) => x.id)])) : null;
    const out = await advancePlayoffs(seeds);
    setResult({ playoffs: true, ...out }); await reload?.();
  };
  const go = async () => {   // quick-sim whatever is left this week, then move on
    setError(''); setResult(null);
    const real = await savedWeek();
    if (real != null && real !== Math.min(12, currentWeek() || 1)) { await reload?.(); throw new Error(`The league is on Week ${real} now (it changed in another window). Check it, then go again.`); }
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
        <b className="week-num">{round ? `${round.icon} ${round.name}` : atAwards ? '🏅 Award Ceremony' : inSeason ? `Week ${wk}` : 'Offseason'}</b>
        <p className="dim">{seasonOver ? 'Craft Bowl week: the last game of the season. Nothing comes after it yet.' : round ? `Playoffs: every game is one and done. When this round is over, set the ${nextRound?.name}.`
          : atAwards ? 'The regular season is over. Run the show from the Live tab, then start the playoffs: the Quarterfinals (top 4 in each conference).' : inSeason
          ? 'Go to the next week any time: games this week that haven\'t been played get quick-simmed first.'
          : 'Game weeks start when the regular season begins (the last offseason step, Training camp, starts Week 1).'}</p>
        {inPlayoffs ? <ConfirmButton className="btn" label={seasonOver ? '🏆 Season complete' : `${nextRound.icon} ${atAwards ? 'Start the playoffs' : `Go to the ${nextRound.name}`}`} disabled={!canControl || seasonOver || !!simming}
          title={atAwards ? 'Start the playoffs?' : `Finish the ${round?.name}?`} yes={atAwards ? 'Start the Quarterfinals' : `Set the ${nextRound?.name}`}
          text={`${inSandbox() ? '🧪 TEST mode. ' : ''}${atAwards && cer && !cer.finished ? '⚠️ The award show hasn\'t run yet: starting the playoffs skips it. ' : ''}${left.length ? `${left.length} unplayed game${left.length === 1 ? '' : 's'} this round get${left.length === 1 ? 's' : ''} quick-simmed first (final results, no broadcast). ` : ''}${atAwards ? 'Seeds come from the final standings: 1 hosts 4 and 2 hosts 3 in each conference.' : nextRound?.kind === 'craft_bowl' ? 'The two conference champions meet in the Craft Bowl.' : 'The winners meet for each conference title, the better seed at home.'} Every coach gets a notice.`} onConfirm={goPlayoffs} />
        : needAwards && !left.length ? <button className="btn" disabled={!canControl} onClick={() => setMustLock(true)}>🏅 Go to award ceremony</button>
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
        {result?.playoffs && <p className="week-result">✅ {result.round} {result.games === 1 ? 'is' : 'are'} set: {result.games} game{result.games === 1 ? '' : 's'} on the Live tab.</p>}
        {result && !result.playoffs && <p className="week-result">✅ Week {result.week} is here. Bots: {result.bots.blocks} on the block · {result.bots.deals} bot trade{result.bots.deals === 1 ? '' : 's'} · {result.bots.offers} offer{result.bots.offers === 1 ? '' : 's'} to coaches · {result.bots.filled} free agents signed.</p>}
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
