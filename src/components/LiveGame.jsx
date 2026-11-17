// The game itself, right after the intro: loads both teams' starters, plays it with the official engine run (the server's
// kickoff seed and real coin flip, same as a quick sim), shows it on the pixel broadcast, and makes it final when it ends.
import React, { useEffect, useMemo, useState } from 'react';
import PixelGame from './PixelGame.jsx';
import { useGameLineups } from '../data/gameLineups.js';
import { isRealGame } from '../data/gameState.js';
import { playOfficial, finalizeGame, isRivalGame } from '../data/gameResults.js';

const seedOf = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// game: the scheduled game. home/away: team objects. kick: { receiving, seed } from the kickoff.
export default function LiveGame({ game, home, away, kick }) {
  const lineups = useGameLineups(home.id, away.id);
  const [rivalry, setRivalry] = useState(null), [saved, setSaved] = useState(''), real = isRealGame(game.id);
  useEffect(() => { let on = true; isRivalGame(home.id, away.id).then((r) => on && setRivalry(r)).catch(() => on && setRivalry(false)); return () => { on = false; }; }, [home.id, away.id]);
  const k = useMemo(() => (kick?.seed ? kick : { ...kick, seed: seedOf(game.id) }), [kick, game.id]);
  const result = useMemo(() => lineups && rivalry !== null && playOfficial(lineups, home.id, away.id, k, rivalry), [lineups, rivalry, k]); // eslint-disable-line react-hooks/exhaustive-deps
  const onDone = () => {
    if (!real || !kick?.seed || saved) return;
    setSaved('saving');
    finalizeGame(game.id, result, lineups, kick, 'watched').then(() => setSaved('saved')).catch((e) => setSaved(`⚠️ ${e.message}`));
  };
  if (!result) return <div className="intro-scene sc-end"><h2>Kickoff is next</h2><p>Loading the starters…</p></div>;
  return (
    <>
      <PixelGame game={result} teams={{ home, away }} lineups={lineups} match={game} full onDone={onDone} />
      {saved && saved !== 'saving' && <div className={`lg-saved${saved === 'saved' ? '' : ' bad'}`}>{saved === 'saved' ? '✅ Final saved: records and stats are in' : saved}</div>}
    </>
  );
}
