import React, { useState } from 'react';
import { setGameClock, resetGame, testScore } from '../data/gameState.js';

// Commissioner, game screen: temporary test buttons until the game engine runs games. Run or stop the clock (a coach's timeout
// stops it), add a touchdown or field goal to either team (to see scores animate on every screen), or reset the game.
export default function GameTestControls({ id, st, home, away, onChange }) {
  const [err, setErr] = useState('');
  const act = async (fn) => { setErr(''); try { await fn(); onChange(); } catch (e) { setErr(e.message); } };
  return (
    <div className="gp-test">
      <small>🧪 Test controls (the game engine replaces these)</small>
      <div>
        <button className="btn small" onClick={() => act(() => setGameClock(id, !st.clock_running))}>{st.clock_running ? '⏸ Stop clock' : '▶ Run clock'}</button>
        <button className="btn small ghost" onClick={() => act(() => testScore(id, 'away', 7))}>+7 {away.code}</button>
        <button className="btn small ghost" onClick={() => act(() => testScore(id, 'away', 3))}>+3 {away.code}</button>
        <button className="btn small ghost" onClick={() => act(() => testScore(id, 'home', 7))}>+7 {home.code}</button>
        <button className="btn small ghost" onClick={() => act(() => testScore(id, 'home', 3))}>+3 {home.code}</button>
        <button className="btn small ghost" onClick={() => act(() => resetGame(id))}>↺ Reset</button>
      </div>
      {err && <p className="form-error">{err}</p>}
    </div>
  );
}
