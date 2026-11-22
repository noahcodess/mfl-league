// The referee's announcement after a flag, the same on every network: a black-and-white striped panel slides in under the
// close-up of the official and his words type out line by line ("HOLDING" / "#95, SNOWY MOUNTAIN CREEPERS" / "10-YARD
// PENALTY · REPEAT 2ND DOWN") while he makes the signal on the field.
import React, { useEffect, useState } from 'react';

export default function RefCall({ call }) {
  const text = call.lines.join('\n'), [n, setN] = useState(0);
  useEffect(() => { const t0 = performance.now() + 700, id = setInterval(() => setN(Math.max(0, Math.floor((performance.now() - t0) / 38))), 30); return () => clearInterval(id); }, [text]);
  const shown = text.slice(0, n).split('\n');
  return (
    <div className="refcall">
      <span className="refcall-tag">🚩 Penalty</span>
      <div className="refcall-panel">
        {call.lines.map((l, k) => <b key={k} className={`refcall-l l${k}`}>{shown[k] ?? ''}{shown.length - 1 === k && n < text.length && <i className="refcall-caret" />}</b>)}
      </div>
    </div>
  );
}
