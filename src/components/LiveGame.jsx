// The game itself, right after the intro: loads both teams' starters, plays it with the official engine run (the server's
// kickoff seed and real coin flip, same as a quick sim), shows it on the pixel broadcast, and makes it final when it ends.
// It saves the run and which play it's on, so closing it pauses the game; resume (a play number) picks up right there.
import React, { useEffect, useMemo, useState } from 'react';
import PixelGame from './PixelGame.jsx';
import { useGameLineups } from '../data/gameLineups.js';
import { isRealGame } from '../data/gameState.js';
import { playOfficial, finalizeGame, isRivalGame, loadReplay, saveReplay, saveProgress } from '../data/gameResults.js';

const seedOf = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// game: the scheduled game. home/away: team objects. kick: { receiving, seed } from the kickoff.
export default function LiveGame({ game, home, away, kick, resume = 0 }) {
  const lineups = useGameLineups(home.id, away.id);
  const [rivalry, setRivalry] = useState(null), [done, setDone] = useState(''), real = isRealGame(game.id);
  useEffect(() => { let on = true; isRivalGame(home.id, away.id).then((r) => on && setRivalry(r)).catch(() => on && setRivalry(false)); return () => { on = false; }; }, [home.id, away.id]);
  const k = useMemo(() => (kick?.seed ? kick : { ...kick, seed: seedOf(game.id) }), [kick, game.id]);
  const [saved, setSavedRun] = useState(real && kick?.already ? undefined : null);   // a paused game's saved run (undefined = still looking)
  useEffect(() => { if (saved === undefined) loadReplay(game.id, kick.seed).then((r) => setSavedRun(r || null), () => setSavedRun(null)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const fresh = useMemo(() => saved === null && lineups && rivalry !== null && playOfficial(lineups, home.id, away.id, k, rivalry), [saved, lineups, rivalry, k]); // eslint-disable-line react-hooks/exhaustive-deps
  const result = saved || fresh;
  useEffect(() => { if (fresh && real && kick?.seed) saveReplay(game.id, kick.seed, fresh); }, [fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const onPlay = (i) => { if (real && kick?.seed && i < result.plays.length) saveProgress(game.id, i, result.plays[i]); };
  const onDone = () => {
    if (!real || !kick?.seed || done) return;
    setDone('saving');
    finalizeGame(game.id, result, lineups, kick, 'watched').then(() => setDone('saved')).catch((e) => setDone(`⚠️ ${e.message}`));
  };
  if (!result || !lineups) return <div className="intro-scene sc-end"><h2>Kickoff is next</h2><p>Loading the starters…</p></div>;
  return (
    <>
      <PixelGame game={result} teams={{ home, away }} lineups={lineups} match={game} full onDone={onDone} onPlay={onPlay} startAt={Math.min(resume, result.plays.length - 1)} />
      {done && done !== 'saving' && <div className={`lg-saved${done === 'saved' ? '' : ' bad'}`}>{done === 'saved' ? '✅ Final saved: records and stats are in' : done}</div>}
    </>
  );
}
