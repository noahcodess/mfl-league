import React from 'react';
import { money } from '../lib/format.js';

// Salary cap meter: contracts on the books vs the cap, with the posted figure for comparison.
export default function CapBar({ used, limit, posted }) {
  const pct = Math.min(100, (used / limit) * 100);
  const off = posted != null && Math.abs(posted - used) > 100000;
  return (
    <div className="cap">
      <div className="cap-top">
        <span>Salary cap</span>
        <strong>{money(used)} / {money(limit)}</strong>
      </div>
      <div className="cap-track"><div className={`cap-fill ${pct > 95 ? 'hot' : ''}`} style={{ width: `${pct}%` }} /></div>
      <div className="cap-foot">
        <span>{money(limit - used)} room</span>
        {posted != null && <span className={off ? 'warn' : ''}>Posted in Discord: {money(posted)}</span>}
      </div>
    </div>
  );
}
