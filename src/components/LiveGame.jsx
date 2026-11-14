// The game itself, right after the intro: loads both teams' starters, lets the engine play it (the real coin flip decides
// who receives), and shows it on the pixel broadcast from the opening kickoff. Nothing is saved yet.
import React, { useMemo } from 'react';
import PixelGame from './PixelGame.jsx';
import { useGameLineups } from '../data/gameLineups.js';
import { playGame } from '../lib/simGame.js';

const seedOf = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// game: the scheduled game. home/away: team objects. kick: { receiving } from the coin flip. run: which start this is.
export default function LiveGame({ game, home, away, kick, run = 0 }) {
  const lineups = useGameLineups(home.id, away.id);
  const result = useMemo(() => lineups && playGame(lineups.home, lineups.away, seedOf(`${game.id}-${run}`), { receiver: kick?.receiving === home.id ? 'home' : kick?.receiving === away.id ? 'away' : undefined }),
    [lineups, game.id, run, kick?.receiving]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!result) return <div className="intro-scene sc-end"><h2>Kickoff is next</h2><p>Loading the starters…</p></div>;
  return <PixelGame game={result} teams={{ home, away }} lineups={lineups} match={game} full />;
}
