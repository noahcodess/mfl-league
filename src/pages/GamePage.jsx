import React, { useState } from 'react';
import TeamBadge from '../components/TeamBadge.jsx';
import GameIntro from '../components/GameIntro.jsx';
import { useGame } from '../data/liveSeason.js';
import { getTeam } from '../data/teams.js';
import { broadcastFor } from '../data/broadcast.js';
import { links } from '../lib/router.js';

// A game (commissioner only for now): the matchup and a Start game button that plays the broadcast intro. The game itself
// comes with the game engine.
export default function GamePage({ id, canControl }) {
  const found = useGame(id);
  const [run, setRun] = useState(0);
  if (!canControl) return <p className="dim">Only the commissioner can open games right now.</p>;
  if (!found) return <p className="dim">Looking for that game...</p>;
  const { game, season } = found, home = getTeam(game.home), away = getTeam(game.away), bc = broadcastFor(game, home);
  return (
    <div className="game-page">
      <a href={links.live} className="dim">← Live</a>
      <section className="card gp-card">
        <img className="gp-net" src={bc.logo} alt={bc.title} />
        <div className="gp-teams"><TeamBadge team={away} size="lg" /><b>at</b><TeamBadge team={home} size="lg" /></div>
        <h2>{away.name} at {home.name}</h2>
        <p className="dim">Week {game.week} · {game.time} · {bc.title}</p>
        <button className="btn gp-start" onClick={() => setRun((n) => n + 1)}>▶ Start game</button>
      </section>
      {run > 0 && <GameIntro key={run} game={game} season={season} onClose={() => setRun(0)} onReplay={() => setRun((n) => n + 1)} />}
    </div>
  );
}
