import React, { useState } from 'react';
import GameIntro from '../components/GameIntro.jsx';
import KickoffClock, { useNow } from '../components/KickoffClock.jsx';
import StartGameButton from '../components/StartGameButton.jsx';
import GameTestControls from '../components/GameTestControls.jsx';
import { useGame, useRivals, isRivalry } from '../data/liveSeason.js';
import { useGameState, isRealGame, startGame, flipKickoff, PREGAME } from '../data/gameState.js';
import { useStadiums } from '../data/stadiums.js';
import { getTeam } from '../data/teams.js';
import { broadcastFor } from '../data/broadcast.js';
import { records, recordText } from '../lib/seasonStats.js';
import { links } from '../lib/router.js';
import { brightness } from '../lib/pixels.js';

const ROOM_OPENS = 5 * 60e3;
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// A game's screen, for everyone: the program's logo on top, the two teams side by side, when it is (a ticking countdown inside
// 2 hours), and one button that depends on who's looking. Commissioner: Start game (plays the intro). A coach in the game:
// Enter coaching room (counts down until it opens 5 minutes before kickoff). Everyone else: watch on Discord.
export default function GamePage({ id, canControl, teamId }) {
  const found = useGame(id), rivals = useRivals(), stadiums = useStadiums(), now = useNow();
  const [version, setVersion] = useState(0);
  const live = useGameState(id, version);
  const [local, setLocal] = useState(null), [run, setRun] = useState(0), [kick, setKick] = useState(null);
  if (!found) return <p className="dim">Looking for that game...</p>;
  const { game, season } = found, home = getTeam(game.home), away = getTeam(game.away), bc = broadcastFor(game, home);
  const real = isRealGame(id), st = real ? live : (local || PREGAME), rec = records(season.weeks.slice(0, game.week - 1));
  const mine = [home.id, away.id].includes(teamId), at = game.startsAt ? Date.parse(game.startsAt) : null;
  const roomOpen = !real || (at && now >= at - ROOM_OPENS) || st?.status === 'live';
  const start = async () => {
    let k;
    if (real) { k = await startGame(id); setVersion((v) => v + 1); } else { k = flipKickoff(game); setLocal({ ...PREGAME, status: 'live', ...k, possession: k.receiving, down: 1, togo: 10, ball_on: 25 }); }
    setKick(k); setRun((n) => n + 1);
  };
  const team = (t, side) => (
    <div className={`gp-team ${side}`} style={{ '--tc': t.color, '--ta': brightness(t.accent) < 0.35 ? '#ffffff' : t.accent }}>
      <img src={t.logo} alt="" />
      <small>{side === 'home' ? 'Home' : 'Away'}</small><b>{t.name}</b><span>{recordText(rec[t.id])}</span>
      {st?.status === 'live' && <strong className="gp-score">{st[`${side}_score`]}</strong>}
    </div>
  );
  return (
    <div className="game-page">
      <a href={links.live} className="dim">← Live</a>
      <section className="gp-hero" style={{ '--ac': away.color, '--hc': home.color }}>
        <img className="gp-net" src={bc.logo} alt={bc.title} />
        <div className="gp-match">{team(away, 'away')}<span className="gp-at">at</span>{team(home, 'home')}</div>
        <p className="gp-where">🏟️ {stadiums[home.id]?.name || home.name} · Week {game.week} · {bc.title}{isRivalry(game, rivals) && <span className="rival-badge">⚔️ Rivalry</span>}</p>
        <KickoffClock startsAt={game.startsAt} status={st?.status} />
        <div className="gp-actions">
          {canControl && <StartGameButton startsAt={game.startsAt} now={now} onStart={start} />}
          {mine && (roomOpen ? <a className="btn gp-room" href={links.coaching(game.id)}>🎧 Enter coaching room</a>
            : <button className="btn gp-room" disabled>🎧 Coaching room {at ? `opens in ${mmss(at - ROOM_OPENS - now)}` : 'opens 5 min before kickoff'}</button>)}
          {!canControl && !mine && <span className="gp-discord">🎧 Watch the game on Discord</span>}
        </div>
        {canControl && real && st?.status === 'live' && <GameTestControls id={id} st={st} home={home} away={away} onChange={() => setVersion((v) => v + 1)} />}
      </section>
      {run > 0 && <GameIntro key={run} game={game} season={season} kick={kick} st={st} onClose={() => setRun(0)} onReplay={() => setRun((n) => n + 1)} />}
    </div>
  );
}
