import React from 'react';
import { gameClockText, quarterText } from '../data/gameState.js';

// Broadcast Booth: the playback controls (pause, speed, back, next, jumps), holding the snap (the play clock), and the
// time until the next play. Jumps only move the broadcast through the game the engine already played.
export default function BoothControls({ s, send }) {
  const spd = s.speed || 1, left = s.play && !s.post ? Math.max(0, (s.T0 ?? 0) - (s.t ?? 0)) : null;
  const toNext = s.play ? Math.max(0, ((s.tEnd ?? 0) + (s.dead ?? 0) - (s.t ?? 0)) / spd) : 0;
  return (
    <section className="booth-card">
      <h3>🎛️ Controls</h3>
      <div className="booth-row">
        <button className={`btn${s.paused ? ' good' : ''}`} onClick={() => send(s.paused ? 'play' : 'pause')}>{s.paused ? '▶ Play' : '⏸ Pause (game clock)'}</button>
        {[1, 2, 4].map((v) => <button key={v} className={`btn small${spd === v ? '' : ' ghost'}`} onClick={() => send('speed', v)}>{v}x</button>)}
      </div>
      <div className="booth-row">
        <button className="btn small ghost" disabled={s.i === 0} onClick={() => send('back')}>⏮ Back a play</button>
        <button className="btn small ghost" onClick={() => send('next')}>Next play ⏭</button>
        <button className={`btn small${s.hold ? ' good' : ' ghost'}`} onClick={() => send('hold', !s.hold)} title="Stops the play clock before the snap">{s.hold ? '▶ Let them snap' : '✋ Hold the snap (play clock)'}</button>
      </div>
      <div className="booth-row">
        <button className="btn small ghost" onClick={() => send('jump', 'nextq')}>⏩ Sim to next quarter</button>
        <button className="btn small ghost" disabled={!(s.marks?.half > s.i)} onClick={() => send('jump', 'half')}>⏩ Sim to halftime</button>
        <button className="btn small ghost" disabled={!(s.marks?.ot > s.i)} onClick={() => send('jump', 'ot')}>⏩ Sim to overtime</button>
        <button className="btn small danger" onClick={() => send('jump', 'end')}>⏭ Sim to the end</button>
      </div>
      <div className="booth-stats">
        <div><small>Play</small><b>{Math.min(s.i + 1, s.total)} / {s.total}</b></div>
        <div><small>Clock</small><b>{!s.play ? 'Final' : `${quarterText(s.play.before.quarter)} ${gameClockText(s.play.before.quarter, Math.max(0, Math.ceil(s.clock ?? s.play.before.clock)))}`}</b></div>
        <div><small>Play clock</small><b className={left != null && s.playClock <= 5 ? 'hot' : ''}>{s.playClock ?? '-'}</b></div>
        <div><small>Snap in</small><b>{left != null ? `${(left / spd).toFixed(1)}s` : 'live'}</b></div>
        <div><small>Next play in</small><b>{toNext.toFixed(1)}s</b></div>
      </div>
    </section>
  );
}
