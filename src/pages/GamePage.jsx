import React, { useState } from 'react';
import GameIntro from '../components/GameIntro.jsx';
import KickoffClock, { useNow } from '../components/KickoffClock.jsx';
import StartGameButton from '../components/StartGameButton.jsx';
import QuickSimButton from '../components/QuickSimButton.jsx';
import GameFinal from '../components/GameFinal.jsx';
import FinalHandoff from '../components/FinalHandoff.jsx';
import { useWeekGate } from '../components/WeekGate.jsx';
import { unfinalizeGame } from '../data/gameResults.js';
import { openGameBooth } from '../lib/windows.js';
import { useGame, useRivals, isRivalry } from '../data/liveSeason.js';
import { useGameState, isRealGame, startGame, flipKickoff, PREGAME, clockText, quarterText, finalText } from '../data/gameState.js';
import { useStadiums } from '../data/stadiums.js';
import { getTeam, isTestMode } from '../data/teams.js';
import { broadcastFor } from '../data/broadcast.js';
import { records, recordText } from '../lib/seasonStats.js';
import { links } from '../lib/router.js';
import { brightness } from '../lib/pixels.js';
import { ConfMatch } from '../components/ConfLogo.jsx';

const ROOM_OPENS = 5 * 60e3;
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// A game's screen, for everyone: the program's logo on top, the two teams side by side, when it is (a ticking countdown inside
// 2 hours), and one button that depends on who's looking. Commissioner: Start game (plays the intro). A coach in the game:
// Enter coaching room (counts down until it opens 5 minutes before kickoff). Everyone else: watch on Discord.
// A started game that was closed is paused: its score and clock show, and the commissioner gets Resume. A final game just
// says FINAL, with the Player of the Game and the stat sheet underneath. A watched game's end-of-game show lands here.
export default function GamePage({ id, canControl, teamId }) {
  const found = useGame(id), rivals = useRivals(), stadiums = useStadiums(), now = useNow();
  const [version, setVersion] = useState(0);
  const live = useGameState(id, version);
  const [local, setLocal] = useState(null), [run, setRun] = useState(0), [kick, setKick] = useState(null), [resumeAt, setResumeAt] = useState(null), [handoff, setHandoff] = useState(null);
  const gate = useWeekGate(found?.game || { week: 0 }, found?.season);
  if (!found) return <p className="dim">Looking for that game...</p>;
  const { game, season } = found, home = getTeam(game.home), away = getTeam(game.away), bc = broadcastFor(game, home);
  const real = isRealGame(id), st = real ? live : (local || PREGAME), rec = records(season.weeks.slice(0, game.week - 1));
  const mine = [home.id, away.id].includes(teamId), at = game.startsAt ? Date.parse(game.startsAt) : null;
  const roomOpen = !real || (at && now >= at - ROOM_OPENS) || st?.status === 'live';
  const final = game.status === 'final', score = (side) => (final ? game[`${side}Score`] : st?.[`${side}_score`]);
  const paused = real && !final && st?.status === 'live';
  const resume = async () => { const k = await startGame(id); setKick(k); setResumeAt(st?.play_index || 0); setRun((n) => n + 1); };
  const start = async () => {
    let k; setResumeAt(null);
    if (real) { k = await startGame(id); setVersion((v) => v + 1); } else { k = flipKickoff(game); setLocal({ ...PREGAME, status: 'live', ...k, possession: k.receiving, down: 1, togo: 10, ball_on: 25 }); }
    setKick(k); setRun((n) => n + 1);
  };
  const team = (t, side) => (
    <div className={`gp-team ${side}`} style={{ '--tc': t.color, '--ta': brightness(t.accent) < 0.35 ? '#ffffff' : t.accent }}>
      <img src={t.logo} alt="" />
      <small>{side === 'home' ? 'Home' : 'Away'}</small><b>{t.name}</b><span>{recordText(rec[t.id])}</span>
      {(final || st?.status === 'live') && <strong className="gp-score">{score(side)}</strong>}
    </div>
  );
  return (
    <div className="game-page">
      <a href={links.live} className="dim">← Live</a>
      <section className="gp-hero" style={{ '--ac': away.color, '--hc': home.color }}>
        <img className="gp-net" src={bc.logo} alt={bc.title} />
        <div className="gp-match">{team(away, 'away')}<span className="gp-at">at</span>{team(home, 'home')}</div>
        <p className="gp-where">🏟️ {stadiums[home.id]?.name || home.name} · Week {game.week} · {bc.title}{isRivalry(game, rivals) && <span className="rival-badge">⚔️ Rivalry</span>}<ConfMatch home={home} away={away} /></p>
        {final ? <p className="gp-final">{finalText(st?.quarter).toUpperCase()}</p> : paused ? (
          <p className="gp-paused"><b>⏸ PAUSED</b><span>{quarterText(st.quarter)}{st.quarter >= 5 ? '' : ` · ${clockText(st.clock_left ?? 0)} left`}</span></p>
        ) : <KickoffClock startsAt={game.startsAt} status={st?.status} />}
        <div className="gp-actions">
          {canControl && paused && <button className="btn gp-start ready" onClick={() => gate.run(resume)}>▶ Resume</button>}
          {canControl && !final && !paused && <StartGameButton startsAt={game.startsAt} now={now} onStart={start} gate={gate.run} />}
          {canControl && !final && <button className="btn ghost gp-booth" onClick={() => openGameBooth(id)} title="Your private window: controls, coaches, key plays, graphics, stats, test tools">🎛️ Open broadcast booth</button>}
          {canControl && !final && <QuickSimButton game={game} home={home} away={away} gate={gate.run} />}
          {canControl && final && real && isTestMode() && <button className="btn ghost small" title="Test mode only" onClick={() => unfinalizeGame(id).then(() => setVersion((v) => v + 1))}>↩ Unplay (test)</button>}
          {mine && !final && (roomOpen ? <a className="btn gp-room" href={links.coaching(game.id)}>🎧 Enter coaching room</a>
            : <button className="btn gp-room" disabled>🎧 Coaching room {at ? `opens in ${mmss(at - ROOM_OPENS - now)}` : 'opens 5 min before kickoff'}</button>)}
          {!canControl && !mine && !final && <span className="gp-discord">🎧 Watch the game on Discord</span>}
        </div>
      </section>
      {final && real && <GameFinal game={game} home={home} away={away} />}
      {gate.ui}
      {run > 0 && <GameIntro key={run} game={game} season={season} kick={kick} st={st} resume={resumeAt} onClose={() => { setRun(0); setVersion((v) => v + 1); }} onReplay={() => setRun((n) => n + 1)}
        onFinal={(d) => { setHandoff(d); setTimeout(() => { setRun(0); setVersion((v) => v + 1); }, 450); }} />}   {/* the end-of-game show lands on this page */}
      {handoff && <FinalHandoff data={handoff} onDone={() => setHandoff(null)} />}
    </div>
  );
}
