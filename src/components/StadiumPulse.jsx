// The Stadium Pulse meter on the broadcast: STADIUM PULSE over sixteen LED segments, the crowd's mood word and the noise in
// decibels. Like a real noise meter it never sits still: the level and the dB reading bounce a few points a few times a
// second (more up than down), it shakes harder the louder it gets (the rest of the graphics never shake), beats like a
// heart once it's electric, and when the noise caused the mistake, "THE CROWD DID THAT" pops under it.
// v: 0-100. net: the network key (colors). hit: the visitors just cracked because of the noise. out: on its way off.
import React, { useEffect, useState } from 'react';
import { pulseDb, pulseWord } from '../lib/stadiumPulse.js';

const BARS = 16;
// A noise meter's wobble: usually 2-3 points either way, now and then up to 6, leaning up.
const wobble = () => { const big = Math.random() < 0.12, r = Math.random() * 2 - 0.8; return Math.round(r * (big ? 6 : 3)); };

export default function StadiumPulse({ v, net, hit = false, out = false }) {
  const [j, setJ] = useState({ lvl: 0, db: 0 }), [boot, setBoot] = useState(true);   // boot: the bars light up one by one when it first comes on
  useEffect(() => { const id = setInterval(() => setJ({ lvl: wobble(), db: wobble() }), 210), b = setTimeout(() => setBoot(false), 1000); return () => { clearInterval(id); clearTimeout(b); }; }, []);
  const lvl = Math.max(1, Math.min(100, v + j.lvl)), lit = Math.max(1, Math.round((lvl / 100) * BARS)), amp = Math.max(0, (v - 35) / 65);
  return (
    <div className={`sp sp-${net}${v >= 72 ? ' sp-hot' : ''}${v >= 88 ? ' sp-max' : ''}${out ? ' out' : ''}`} style={{ '--amp': amp.toFixed(2) }}>
      <div className="sp-box">
        <small>Stadium Pulse</small>
        <span className="sp-bars">{Array.from({ length: BARS }, (_, k) => <i key={k} className={k < lit ? 'on' : ''} style={{ '--k': k, animationDelay: boot ? `${0.1 + k * 0.045}s` : '0s' }} />)}</span>
        <b>{pulseWord(v)}<em>{pulseDb(v) + j.db} dB</em></b>
      </div>
      {hit && <span className="sp-hit">📣 The crowd did that</span>}
    </div>
  );
}
