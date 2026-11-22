import React, { useEffect, useRef, useState } from 'react';

// Down and distance that changes with a visible transition (about 0.7 seconds), so "1st & 10" turning into "2nd & 8" is
// easy to follow: the old one slides up and out while the new one rolls in from below with a light flash. Used by every
// scorebug; each network's bug gives it its own colors (downText.css). FLAG (and back) swaps in at once.
export default function DownText({ text }) {
  const [prev, setPrev] = useState(null), last = useRef(text);
  useEffect(() => {
    if (last.current === text) return undefined;
    const old = last.current; last.current = text;
    if (text === 'FLAG' || old === 'FLAG') { setPrev(null); return undefined; }   // a flag swaps in at once (it has its own pop), so the box never jumps around
    setPrev(old);
    const t = setTimeout(() => setPrev(null), 760);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <span className={`dt${prev != null ? ' turning' : ''}`}>
      {prev != null && <span className="dt-old" key={`o-${prev}`}>{prev}</span>}
      <span className="dt-new" key={`n-${text}`}>{text}</span>
    </span>
  );
}
