// The game itself, right after the intro: loads both teams' starters, plays it with the official engine run (the server's
// kickoff seed and real coin flip, same as a quick sim), shows it on the pixel broadcast, and makes it final when it ends.
// It saves the run and which play it's on, so closing it pauses the game; resume (a play number) picks up right there.
// Live inputs (a coach's timeout from his room, the commissioner's timeouts and test tools from the Broadcast Booth) replay
// the engine from the next play on; everything already shown stays exactly as it was.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PixelGame from './PixelGame.jsx';
import { useGameLineups } from '../data/gameLineups.js';
import { isRealGame } from '../data/gameState.js';
import { loadCrowd } from '../data/gameCrowd.js';
import { playOfficial, finalizeGame, isRivalGame, loadReplay, saveReplay, saveProgress, addGameInput } from '../data/gameResults.js';
import { setBallStyle } from '../lib/sceneBall.js';

const seedOf = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const DEV_INJ = import.meta.env.DEV && Number(new URLSearchParams(window.location.search).get('devinjury'));   // dev only: ?devinjury=N hurts someone on play N
const sameInputs = (a = [], b = []) => JSON.stringify(a) === JSON.stringify(b);

// game: the scheduled game. home/away: team objects. kick: { receiving, seed } from the kickoff. st: the live game state
// (inputs saved with it, a coach's timeout). rec: records for the scorebugs.
export default function LiveGame({ game, home, away, kick, resume = 0, st = null, rec = null, season, onFinal }) {
  const lineups = useGameLineups(home.id, away.id);
  const [rivalry, setRivalry] = useState(null), [done, setDone] = useState(''), real = isRealGame(game.id);
  const [inputs, setInputs] = useState(() => (kick?.already ? st?.inputs || [] : DEV_INJ ? [{ kind: 'injury', n: DEV_INJ }] : []));
  const [crowd, setCrowd] = useState(undefined);   // the crowd (Stadium Pulse), fixed before kickoff so every rerun plays the same
  useEffect(() => { setBallStyle(game.kind === 'craft_bowl' ? 'gold' : 'brown'); return () => setBallStyle('brown'); }, [game.kind]);   // the Craft Bowl plays with a gold ball
  useEffect(() => { let on = true; loadCrowd(game).then((c) => on && setCrowd(c || null)); return () => { on = false; }; }, [game.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { let on = true; isRivalGame(home.id, away.id).then((r) => on && setRivalry(r)).catch(() => on && setRivalry(false)); return () => { on = false; }; }, [home.id, away.id]);
  const k = useMemo(() => (kick?.seed ? kick : { ...kick, seed: seedOf(game.id) }), [kick, game.id]);
  const [saved, setSavedRun] = useState(real && kick?.already ? undefined : null);   // a paused game's saved run (undefined = still looking)
  useEffect(() => { if (saved === undefined) loadReplay(game.id, kick.seed).then((r) => setSavedRun(r || null), () => setSavedRun(null)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const useSaved = saved && sameInputs(saved.inputs, inputs);
  const fresh = useMemo(() => !useSaved && saved !== undefined && lineups && rivalry !== null && crowd !== undefined && { ...playOfficial(lineups, home.id, away.id, k, rivalry, inputs, crowd), inputs }, [useSaved, saved, lineups, rivalry, k, inputs, crowd]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = useSaved ? saved : fresh;
  useEffect(() => { if (fresh && real && kick?.seed) saveReplay(game.id, kick.seed, fresh); }, [fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  // keep the plays already on screen as the very same objects, so a replay from the next play never restarts this one
  const cur = useRef(resume), prev = useRef(null);
  const result = useMemo(() => {
    if (!base) return null;
    const old = prev.current, keep = cur.current;
    const out = old && old !== base ? { ...base, plays: base.plays.map((p, n) => (n <= keep && old.plays[n]?.text === p.text ? old.plays[n] : p)) } : base;
    prev.current = out; return out;
  }, [base]);
  const onInput = async (x) => {   // before the next play
    const input = { ...x, n: cur.current + 2 };
    if (real) { try { await addGameInput(game.id, input); } catch { return; } }
    setInputs((list) => [...list, input]);
  };
  const seenTo = useRef(st?.last_timeout_at || null);   // a coach's timeout from his coaching room
  useEffect(() => {
    if (!st?.last_timeout_at || st.last_timeout_at === seenTo.current) return;
    seenTo.current = st.last_timeout_at;
    const side = st.last_timeout === home.id ? 'home' : st.last_timeout === away.id ? 'away' : null;
    if (side) onInput({ kind: 'timeout', side, by: 'coach' });
  }, [st?.last_timeout_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const onPlay = (i) => { cur.current = i; if (real && kick?.seed && i < result.plays.length) saveProgress(game.id, i, result.plays[i]); };
  const onDone = () => {
    if (!real || !kick?.seed || done) return;
    setDone('saving');
    finalizeGame(game.id, result, lineups, kick, 'watched').then((r) => setDone(r?.test ? 'test' : 'saved')).catch((e) => setDone(`⚠️ ${e.message}`));
  };
  if (!result || !lineups) return <div className="intro-scene sc-end"><h2>Kickoff is next</h2><p>Loading the starters…</p></div>;
  return (
    <>
      <PixelGame game={result} teams={{ home, away }} lineups={lineups} match={game} full onDone={onDone} onPlay={onPlay} startAt={Math.min(resume, result.plays.length - 1)}
        rec={rec} boothId={game.id} onInput={onInput} sound={crowd || { fill: 0.75 }} finale={season && onFinal ? { match: game, season, onFinal } : null} />
      {done && done !== 'saving' && <div className={`lg-saved${done === 'saved' ? '' : ' bad'}`}>{done === 'saved' ? '✅ Final saved: records and stats are in' : done === 'test' ? '🧪 Test game: a test tool was used, so it isn\'t saved' : done}</div>}
    </>
  );
}
