import React, { useEffect, useRef, useState } from 'react';

// A button you have to press and hold (a bar fills) before it fires. For actions that can't be undone.
export default function HoldButton({ ms = 2500, onDone, children, className = '' }) {
  const [held, setHeld] = useState(false), timer = useRef(null);
  const stop = () => { clearTimeout(timer.current); setHeld(false); };
  const start = (e) => { e.preventDefault(); setHeld(true); timer.current = setTimeout(() => { setHeld(false); onDone?.(); }, ms); };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button type="button" className={`btn hold-btn${held ? ' held' : ''} ${className}`} style={{ '--hold': `${ms}ms` }}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !held) start(e); }} onKeyUp={stop}>
      <i className="hold-fill" aria-hidden="true" /><span>{children}</span>
    </button>
  );
}
