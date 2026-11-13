import React, { useEffect, useRef, useState } from 'react';

// A score on a scorebug. When it changes (0 → 7), the new number pops in with a flash so everyone sees the points land.
export default function ScoreNum({ value, className = '' }) {
  const prev = useRef(value), [bump, setBump] = useState(0);
  useEffect(() => { if (prev.current !== value) { prev.current = value; setBump((b) => b + 1); } }, [value]);
  return <b className={`${className} sb-num${bump ? ' bump' : ''}`} key={bump}>{value}</b>;
}
