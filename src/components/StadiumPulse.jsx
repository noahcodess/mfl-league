// The Stadium Pulse meter on the broadcast: STADIUM PULSE over sixteen LED segments, the crowd's mood word and the noise in
// decibels. Like a real noise meter it never sits still: the lit bars and the dB reading each wander on their own, a
// couple of bars up, one down, two down, at uneven moments (more up than down, always pulled back toward the real level),
// it shakes harder the louder it gets (the rest of the graphics never shake), beats like a heart once it's electric, and
// when the noise caused the mistake, "THE CROWD DID THAT" pops under it. On a home run of unanswered points it says so.
// v: 0-100. net: the network key (colors). hit: the visitors just cracked because of the noise. run: the home side's
// unanswered points (a comeback brewing). out: on its way off.
import React, { useEffect, useState } from 'react';
import { pulseDb, pulseWord, DB_MIN, DB_MAX } from '../lib/stadiumPulse.js';

const BARS = 16;
const pick = (opts) => { let r = Math.random() * opts.reduce((n, [, w]) => n + w, 0); return opts.find(([, w]) => (r -= w) < 0)[0]; };
// One step of a meter's wander: steps of one to three, leaning up, but the further it drifts the harder it's pulled back.
function wander(off, lim, steps) {
  const pull = off >= lim * 0.6 ? -1 : off <= -lim * 0.5 ? 1 : 0;
  const s = pick(steps.map(([d, w]) => [d, w * (pull && Math.sign(d) === pull ? 2.4 : pull && Math.sign(d) === -pull ? 0.35 : 1)]));
  return Math.max(-lim, Math.min(lim, off + s));
}
const BAR_STEPS = [[2, 0.2], [1, 0.22], [0, 0.1], [-1, 0.2], [-2, 0.17], [3, 0.06], [-3, 0.05]];
const DB_STEPS = [[1, 0.24], [2, 0.18], [3, 0.06], [0, 0.08], [-1, 0.22], [-2, 0.16], [-3, 0.06]];

export default function StadiumPulse({ v, net, hit = false, run = null, out = false }) {
  const [j, setJ] = useState({ lvl: 0, db: 0 }), [boot, setBoot] = useState(true);   // boot: the bars light up one by one when it first comes on
  useEffect(() => {
    let id; const tick = () => { setJ((o) => ({ lvl: wander(o.lvl, 4, BAR_STEPS), db: wander(o.db, 6, DB_STEPS) })); id = setTimeout(tick, 140 + Math.random() * 170); };
    id = setTimeout(tick, 300); const b = setTimeout(() => setBoot(false), 1000);
    return () => { clearTimeout(id); clearTimeout(b); };
  }, []);
  const lit = Math.max(1, Math.min(BARS, Math.round((v / 100) * BARS) + j.lvl)), amp = Math.max(0, (v - 35) / 65), db = Math.max(DB_MIN, Math.min(DB_MAX, pulseDb(v) + j.db));
  return (
    <div className={`sp sp-${net}${v >= 72 ? ' sp-hot' : ''}${v >= 88 ? ' sp-max' : ''}${out ? ' out' : ''}`} style={{ '--amp': amp.toFixed(2) }}>
      <div className="sp-box">
        <small>Stadium Pulse</small>
        <span className="sp-bars">{Array.from({ length: BARS }, (_, k) => <i key={k} className={k < lit ? 'on' : ''} style={{ '--k': k, animationDelay: boot ? `${0.1 + k * 0.045}s` : '0s' }} />)}</span>
        <b>{pulseWord(v)}<em>{db} dB</em></b>
      </div>
      {hit ? <span className="sp-hit">📣 The crowd did that</span> : run ? <span className="sp-hit sp-run">🔥 {run}-0 run · they're back in it</span> : null}
    </div>
  );
}
