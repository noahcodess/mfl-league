import React from 'react';

// How interested a free agent is in an offer, 0-100. The tick at 80 is the line he'd sign at next round.
export const SIGN_LINE = 80;

export default function InterestMeter({ value, mine }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const tone = v >= SIGN_LINE ? 'hot' : v >= SIGN_LINE * 0.85 ? 'warm' : 'cold';
  return (
    <span className={`meter ${tone}${mine ? ' mine' : ''}`} title={`${v}% interested${v >= SIGN_LINE ? ' (he would sign this)' : ''}`}>
      <span className="meter-fill" style={{ width: `${v}%` }} />
      <span className="meter-line" style={{ left: `${SIGN_LINE}%` }} />
    </span>
  );
}
