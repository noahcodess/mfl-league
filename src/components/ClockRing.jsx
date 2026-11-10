import React from 'react';
import { clockText } from '../lib/draftClock.js';

// The pick clock: a ring that drains as time runs out, turning gold under 30 seconds and red (and blinking) under 10.
export default function ClockRing({ left, full, paused, size = 180, label = 'on the clock' }) {
  const r = 46; const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, left / (full || 1)));
  // Short (bot) clocks go by how much is left; real clocks turn gold at 30 seconds and red at 10.
  const tone = paused ? 'paused' : full <= 30 ? (frac < 0.34 ? 'gold' : 'green') : left <= 10 ? 'red' : left <= 30 ? 'gold' : 'green';
  return (
    <div className={`clock-ring ${tone}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="clock-track" cx="50" cy="50" r={r} />
        <circle className="clock-fill" cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <div className="clock-text">
        <b>{paused ? '⏸' : clockText(left)}</b>
        <small>{paused ? 'paused' : label}</small>
      </div>
    </div>
  );
}
