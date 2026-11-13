import React, { useState } from 'react';
import TeamBadge from '../components/TeamBadge.jsx';
import GameIntro from '../components/GameIntro.jsx';
import Scorebug from '../components/Scorebug.jsx';
import ScorebugPreview from '../components/ScorebugPreview.jsx';
import { useGame, useRivals, isRivalry } from '../data/liveSeason.js';
import { useGameState, isRealGame, startGame, setGameClock, resetGame, flipKickoff, PREGAME } from '../data/gameState.js';
import { getTeam } from '../data/teams.js';
import { broadcastFor } from '../data/broadcast.js';
import { links } from '../lib/router.js';

// A game (commissioner only for now): the matchup, the live scorebug, and Start game, which flips for who receives and which
// way they go (on the server for real games) and plays the broadcast intro. The test clock buttons let you check that a coach's
// timeout stops the clock here; the game engine will run the clock later.
export default function GamePage({ id, canControl }) {
  const found = useGame(id), rivals = useRivals();
  const [version, setVersion] = useState(0);
  const live = useGameState(id, version);
  const [local, setLocal] = useState(null), [run, setRun] = useState(0), [kick, setKick] = useState(null), [err, setErr] = useState('');
  if (!canControl) return <p className="dim">Only the commissioner can open games right now.</p>;
  if (!found) return <p className="dim">Looking for that game...</p>;
  const { game, season } = found, home = getTeam(game.home), away = getTeam(game.away), bc = broadcastFor(game, home);
  const real = isRealGame(id), st = real ? live : (local || PREGAME);
  const act = async (fn) => { setErr(''); try { await fn(); setVersion((v) => v + 1); } catch (e) { setErr(e.message); } };
  const start = () => act(async () => {
    let k;
    if (real) k = await startGame(id);
    else { k = flipKickoff(game); setLocal({ ...PREGAME, status: 'live', ...k, possession: k.receiving }); }
    setKick(k); setRun((n) => n + 1);
  });
  return (
    <div className="game-page">
      <a href={links.live} className="dim">← Live</a>
      <section className="card gp-card">
        <img className="gp-net" src={bc.logo} alt={bc.title} />
        <div className="gp-teams"><TeamBadge team={away} size="lg" /><b>at</b><TeamBadge team={home} size="lg" /></div>
        <h2>{away.name} at {home.name}</h2>
        <p className="dim">Week {game.week} · {game.time} · {bc.title}{isRivalry(game, rivals) && <span className="rival-badge">⚔️ Rivalry</span>}</p>
        <Scorebug bc={bc} home={home} away={away} st={st} className="gp-bug" />
        <button className="btn gp-start" onClick={start}>▶ Start game</button>
        <a className="dim" href={links.coaching(game.id)}>🎧 Open the coaching room for this game</a>
        {st?.status === 'live' && (
          <div className="gp-test">
            <small className="dim">Test clock (the game engine will run this):</small>
            {real ? <>
              <button className="btn small" onClick={() => act(() => setGameClock(id, !st.clock_running))}>{st.clock_running ? '⏸ Stop clock' : '▶ Run clock'}</button>
              <button className="btn small ghost" onClick={() => act(() => resetGame(id))}>↺ Reset game</button>
            </> : <span className="dim">Sample game: the live clock works on real games.</span>}
          </div>
        )}
        {err && <p className="form-error">{err}</p>}
      </section>
      <ScorebugPreview home={home} away={away} st={st} />
      {run > 0 && <GameIntro key={run} game={game} season={season} kick={kick} st={st} onClose={() => setRun(0)} onReplay={() => setRun((n) => n + 1)} />}
    </div>
  );
}
