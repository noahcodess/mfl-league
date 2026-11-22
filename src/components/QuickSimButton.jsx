import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal.jsx';
import Gamecast from './Gamecast.jsx';
import { simGameNow, playOfficial } from '../data/gameResults.js';
import { isRealGame, flipKickoff, finalText } from '../data/gameState.js';
import { loadLineups } from '../data/gameLineups.js';

// Commissioner: Quick sim, under Start game. Warns first, then the exact same engine run a watched game uses (kickoff seed,
// coin flip, momentum, everything) plays it in a second or two and saves it as final: score, records and every stat.
// The final score pops in with the box score, scoring plays and play-by-play. gate: the "finish last week first" check.
export default function QuickSimButton({ game, home, away, gate }) {
  const [step, setStep] = useState(0), [result, setResult] = useState(null), [err, setErr] = useState('');
  const run = async () => {
    setStep(2); setErr('');
    try {
      const sample = async () => { const [h, a] = await loadLineups([home.id, away.id]), l = { home: h, away: a }; return { lineups: l, result: playOfficial(l, home.id, away.id, { ...flipKickoff(game), seed: Math.floor(Math.random() * 1e9) }, false) }; };
      const [out] = await Promise.all([isRealGame(game.id) ? simGameNow(game.id, home.id, away.id, 'quick', game) : sample(), new Promise((r) => setTimeout(r, 1200))]);
      setResult({ lineups: out.lineups, game: out.result }); setStep(3);
    } catch (e) { setErr(e.message); setStep(1); }
  };
  const names = useMemo(() => {
    const out = {}; if (!result) return out;
    for (const side of ['home', 'away']) { result.lineups[side].all.forEach((p) => { out[p.id] = { ...p, side }; }); ['kickoff', 'punt'].forEach((u) => { const k = result.lineups[side].kickTeams[u].players[0]; out[k.id] = { ...k, side }; }); }
    return out;
  }, [result]);
  const g = result?.game, won = g && (g.score.home > g.score.away ? home : away);
  return (
    <>
      <button className="btn ghost gp-quick" onClick={() => (gate ? gate(() => setStep(1)) : setStep(1))}>⚡ Quick sim</button>
      {step === 1 && (
        <Modal onClose={() => setStep(0)} className="confirm-modal">
          <h2>⚠️ Quick sim this game?</h2>
          <p>The whole game is played instantly. There's no broadcast, and coaches don't get to call key plays.</p>
          <p className="dim">✅ The result is final the moment it's done: score, records and every player's stats are saved.</p>
          {err && <p className="notice bad">{err}</p>}
          <div className="confirm-actions"><button className="btn ghost" onClick={() => setStep(0)}>Cancel</button><button className="btn" onClick={run}>Sim the game</button></div>
        </Modal>
      )}
      {step === 2 && createPortal(<div className="qs-load"><b>Simulating</b><span>{away.name} at {home.name}</span><div className="qs-bar"><i /></div><small>Playing all four quarters…</small></div>, document.body)}
      {step === 3 && g && createPortal(
        <div className="qs-result">
          <div className="qs-card">
            <button className="intro-close" onClick={() => { setStep(0); setResult(null); }} aria-label="Close">✕</button>
            <div className="qs-final">
              <div className={`qs-side${won === away ? ' won' : ''}`} style={{ '--tc': away.color }}><img src={away.logo} alt="" /><span>{away.name}</span><b>{g.score.away}</b></div>
              <em>{finalText(4 + (g.overtimes || 0)).toUpperCase()}</em>
              <div className={`qs-side${won === home ? ' won' : ''}`} style={{ '--tc': home.color }}><img src={home.logo} alt="" /><span>{home.name}</span><b>{g.score.home}</b></div>
            </div>
            <Gamecast game={g} teams={{ home, away }} names={names} finished />
          </div>
        </div>, document.body)}
    </>
  );
}
