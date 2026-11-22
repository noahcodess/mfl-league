// The Stadium Pulse meter on the broadcast: STADIUM PULSE over ten LED segments that light up one by one to the level, the
// crowd's mood word and the noise in decibels. It shakes harder the louder it gets (the rest of the graphics never shake),
// beats like a heart once it's electric, and when the noise caused the mistake, "THE CROWD DID THAT" pops under it.
// v: 0-100. net: the network key (colors). hit: the visitors just cracked because of the noise. out: on its way off.
import React from 'react';
import { pulseDb, pulseWord } from '../lib/stadiumPulse.js';

export default function StadiumPulse({ v, net, hit = false, out = false }) {
  const lit = Math.max(1, Math.round(v / 10)), amp = Math.max(0, (v - 35) / 65);
  return (
    <div className={`sp sp-${net}${v >= 72 ? ' sp-hot' : ''}${v >= 88 ? ' sp-max' : ''}${out ? ' out' : ''}`} style={{ '--amp': amp.toFixed(2) }}>
      <div className="sp-box">
        <small>Stadium Pulse</small>
        <span className="sp-bars">{Array.from({ length: 10 }, (_, k) => <i key={k} className={k < lit ? 'on' : ''} style={{ '--k': k, animationDelay: `${0.15 + k * 0.07}s` }} />)}</span>
        <b>{pulseWord(v)}<em>{pulseDb(v)} dB</em></b>
      </div>
      {hit && <span className="sp-hit">📣 The crowd did that</span>}
    </div>
  );
}
