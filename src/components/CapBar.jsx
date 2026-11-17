import React from 'react';
import { money } from '../lib/format.js';

// Salary cap ring: a red circle that fills as the cap fills (almost closed = almost capped out). Cap hit = contract total spread evenly over its years.
export default function CapBar({ used, limit, small }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const over = used > limit;
  const r = 42, len = 2 * Math.PI * r;
  return (
    <div className={`cap-ring${small ? ' small' : ''}${over ? ' over' : pct > 90 ? ' hot' : ''}`} title={`${money(used)} of ${money(limit)}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="cap-ring-track" cx="50" cy="50" r={r} />
        <circle className="cap-ring-fill" cx="50" cy="50" r={r} style={{ strokeDasharray: len, strokeDashoffset: len * (1 - pct / 100), '--len': len }} />
      </svg>
      <div className="cap-ring-mid"><b>{Math.round(pct)}%</b><small>cap</small></div>
      <div className="cap-ring-side">
        <span>💰 Salary cap</span>
        <strong>{money(used)} <small>/ {money(limit)}</small></strong>
        <em className={over ? 'warn' : ''}>{over ? `${money(used - limit)} over` : `${money(limit - used)} room`}</em>
      </div>
    </div>
  );
}
