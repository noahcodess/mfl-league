import React, { useEffect, useRef, useState } from 'react';
import NetStinger from './NetStinger.jsx';
import { STING_MID, STING_MS } from '../lib/pixelSwarm.js';

// A full-screen break in the broadcast (the halftime report, the overtime rules): the network transition covers the field,
// then each scene plays for its time (a { sting: true } step runs another transition between them), then one last
// transition hands back to the field. onReveal fires as that last transition covers the screen (the game can get going
// underneath); onDone once it has cleared. The commissioner can skip straight to the end.
// steps: [{ ms, render }] or [{ sting: true }].
export default function BreakShow({ net, steps, onReveal, onDone, className = '' }) {
  const [i, setI] = useState(-1), [sting, setSting] = useState(0), [scene, setScene] = useState(null), timers = useRef([]);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const finish = () => {   // the last transition: scenes off as it covers, the game back underneath, then gone
    timers.current.forEach(clearTimeout); timers.current = [];
    setI(steps.length); setSting((n) => n + 1);
    later(() => { setScene(null); onReveal?.(); }, STING_MID);
    later(() => onDone?.(), STING_MS + 50);
  };
  useEffect(() => { setSting(1); later(() => setI(0), STING_MID); return () => timers.current.forEach(clearTimeout); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (i < 0 || i >= steps.length) return undefined;
    const st = steps[i];
    if (st.sting) { setSting((n) => n + 1); const t = setTimeout(() => setI(i + 1), STING_MID); return () => clearTimeout(t); }
    setScene(i);
    const t = setTimeout(() => (i + 1 >= steps.length ? finish() : setI(i + 1)), st.ms);
    return () => clearTimeout(t);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`brk ${className}`}>
      {scene != null && <div className="brk-scene" key={scene}>{steps[scene].render()}</div>}
      {sting > 0 && <NetStinger key={sting} net={net} onDone={() => setSting(0)} />}
      {i < steps.length && <button className="brk-skip" onClick={finish}>Skip ⏭</button>}
    </div>
  );
}
