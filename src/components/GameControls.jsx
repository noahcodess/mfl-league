// The controls under the broadcast: pause, speed, back and next, where we are, the crowd sound, close. On a Sunday night
// game it also counts down to the next starting lineup showcase (introPlan) so the commissioner knows it's coming.
import React from 'react';
import SoundToggle from './SoundToggle.jsx';

const SPEEDS = [1, 2, 4];
export default function GameControls({ paused, setPaused, speed, setSpeed, i, setI, total, done, sound, snd, onClose, intro }) {
  return (
    <div className="ct-row">
      <button className="btn ghost" onClick={() => setPaused(!paused)}>{paused ? '▶ Play' : '⏸ Pause'}</button>
      {SPEEDS.map((s) => <button key={s} className={`btn ghost${speed === s ? ' on' : ''}`} onClick={() => setSpeed(s)}>{s}x</button>)}
      <button className="btn ghost" disabled={i === 0} onClick={() => setI(Math.max(0, i - 1))}>⏮ Back</button>
      <button className="btn ghost" disabled={done} onClick={() => setI(i + 1)}>Next ⏭</button>
      <span className="dim">Play {Math.min(i + 1, total)} of {total}</span>
      {intro && <span className={`ct-intro${intro.when === 'now' ? ' on' : ''}`}>🎬 {intro.label} {intro.when === 'now' ? 'on air' : `displayed ${intro.when}`}</span>}
      {sound && <SoundToggle snd={snd} />}
      {onClose && <button className="btn ghost" onClick={onClose}>✕ Close</button>}
    </div>
  );
}
