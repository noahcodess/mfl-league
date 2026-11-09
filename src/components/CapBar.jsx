import React from 'react';
import { money } from '../lib/format.js';

// Salary cap meter. Cap hit = contract total spread evenly over its years; this is the league's real cap.
export default function CapBar({ used, limit }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="cap">
      <div className="cap-top">
        <span>Salary cap</span>
        <strong>{money(used)} / {money(limit)}</strong>
      </div>
      <div className="cap-track"><div className={`cap-fill ${pct > 95 ? 'hot' : ''}`} style={{ width: `${pct}%` }} /></div>
      <div className="cap-foot">
        <span className={used > limit ? 'warn' : ''}>{used > limit ? `${money(used - limit)} over` : `${money(limit - used)} room`}</span>
        <span>{Math.round(pct)}% used</span>
      </div>
    </div>
  );
}
