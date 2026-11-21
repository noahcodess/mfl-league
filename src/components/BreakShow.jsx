import React, { useEffect, useRef, useState } from 'react';
import NetStinger from './NetStinger.jsx';
import { STING_MID, STING_MS } from '../lib/pixelSwarm.js';

const SWAP_MS = 520;   // how long the old scene takes to slide out while the new one comes in

// A full-screen break in the broadcast (the halftime report, the overtime rules): the network transition covers the field,
// then each scene plays for its time (a { sting: true } step runs another transition between them), then one last
// transition hands back to the field. The backdrop stays up the whole time (only the scenes' content moves between
// scenes, with a light sweep across), so the field never peeks through. onReveal fires as that last transition covers
// the screen (the game can get going underneath); onDone once it has cleared. The commissioner can skip straight to the end.
// The scene going out keeps the same key, so it stays mounted and slides away instead of replaying its entrance.
// steps: [{ ms, render }] or [{ sting: true }].
export default function BreakShow({ net, steps, onReveal, onDone, className = '' }) {
  const [i, setI] = useState(-1), [sting, setSting] = useState(0), [scene, setScene] = useState(null), [old, setOld] = useState(null);
  const [up, setUp] = useState(false), timers = useRef([]), shown = useRef(null);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const finish = () => {   // the last transition: everything off as it covers, the game back underneath, then gone
    timers.current.forEach(clearTimeout); timers.current = [];
    setI(steps.length); setSting((n) => n + 1);
    later(() => { setScene(null); setOld(null); setUp(false); onReveal?.(); }, STING_MID);
    later(() => onDone?.(), STING_MS + 50);
  };
  useEffect(() => { setSting(1); later(() => { setUp(true); setI(0); }, STING_MID); return () => timers.current.forEach(clearTimeout); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (i < 0 || i >= steps.length) return undefined;
    const st = steps[i];
    if (st.sting) { setSting((n) => n + 1); const t = setTimeout(() => setI(i + 1), STING_MID); return () => clearTimeout(t); }
    const covered = steps[i - 1]?.sting || i === 0;   // a transition is covering the screen: just swap, no slide
    if (!covered && shown.current != null) { setOld(shown.current); later(() => setOld(null), SWAP_MS); } else setOld(null);
    shown.current = i; setScene(i);
    const t = setTimeout(() => (i + 1 >= steps.length ? finish() : setI(i + 1)), st.ms);
    return () => clearTimeout(t);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`brk ${className}`}>
      {up && <div className="brk-bg" aria-hidden="true" />}
      {up && <i className="brk-mark" aria-hidden="true" />}
      {old != null && <div className="brk-scene out" key={`sc${old}`} aria-hidden="true">{steps[old].render()}</div>}
      {old != null && <i className="brk-sweep" key={`s${scene}`} aria-hidden="true" />}
      {scene != null && <div className={`brk-scene${old != null ? ' swap' : ''}`} key={`sc${scene}`}>{steps[scene].render()}</div>}
      {sting > 0 && <NetStinger key={sting} net={net} onDone={() => setSting(0)} />}
      {i < steps.length && <button className="brk-skip" onClick={finish}>Skip ⏭</button>}
    </div>
  );
}
