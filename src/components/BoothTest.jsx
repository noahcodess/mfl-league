import React, { useState } from 'react';
import { getTeam } from '../data/teams.js';

// Broadcast Booth → Test (test mode only): tools to try things out without waiting for them to happen. They change the
// game from the next snap (the engine replays from there), so a game touched by one is never saved as a real result.
export default function BoothTest({ s, ids, send }) {
  const [score, setScore] = useState({ home: 0, away: 0 }), [to, setTo] = useState({ side: 'home', count: 0 }), [pc, setPc] = useState(5);
  const test = (input) => send('test', null, { input });
  const name = (side) => getTeam(ids[side])?.code;
  return (
    <details className="booth-card booth-test">
      <summary>🧪 Test tools <small>(test mode · games touched by these aren't saved)</small></summary>
      <div className="booth-row">
        <button className="btn small" onClick={() => test({ kind: 'ot' })}>⏱ Force overtime (tie it, 4th quarter 0:00)</button>
        <button className="btn small ghost" onClick={() => test({ kind: 'win', side: 'away' })}>🏆 Force {name('away')} win</button>
        <button className="btn small ghost" onClick={() => test({ kind: 'win', side: 'home' })}>🏆 Force {name('home')} win</button>
      </div>
      <div className="booth-row">
        <span>Set score</span>
        <label>{name('away')} <input type="number" min="0" value={score.away} onChange={(e) => setScore({ ...score, away: +e.target.value })} /></label>
        <label>{name('home')} <input type="number" min="0" value={score.home} onChange={(e) => setScore({ ...score, home: +e.target.value })} /></label>
        <button className="btn small ghost" onClick={() => test({ kind: 'score', home: score.home, away: score.away })}>Set</button>
      </div>
      <div className="booth-row">
        <span>Set timeouts</span>
        <select value={to.side} onChange={(e) => setTo({ ...to, side: e.target.value })}><option value="away">{name('away')}</option><option value="home">{name('home')}</option></select>
        <select value={to.count} onChange={(e) => setTo({ ...to, count: +e.target.value })}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        <button className="btn small ghost" onClick={() => test({ kind: 'timeouts', side: to.side, count: to.count })}>Set</button>
      </div>
      <div className="booth-row">
        <span>Set play clock</span>
        <input type="number" min="0" max="25" value={pc} onChange={(e) => setPc(+e.target.value)} />
        <button className="btn small ghost" onClick={() => send('pc', pc)}>Set & hold</button>
        <button className="btn small ghost" onClick={() => send('hold', false)}>Release</button>
      </div>
      <div className="booth-row">
        <button className="btn small ghost" onClick={() => send('preview', 'half')}>▶ Preview the halftime report</button>
        <button className="btn small ghost" onClick={() => send('preview', 'ot')}>▶ Preview the overtime rules</button>
        <button className="btn small ghost" disabled={!s?.play} onClick={() => send('deny', s?.pre?.id)}>🚫 Deny this graphic</button>
      </div>
    </details>
  );
}
