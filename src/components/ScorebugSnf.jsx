import React from 'react';
import ScoreNum from './ScoreNum.jsx';
import { clockText } from '../data/gameState.js';
import { recordText } from '../lib/seasonStats.js';

// SNF's scorebug: a long night-blue bar that tapers at both ends with a circle in the middle (like NBC's real one), silver
// edges and a peacock stripe. Big logos at the ends, abbreviation and record, score boxes with timeouts under them; the circle
// holds the peacock, the clock, the quarter and the play clock. Down and distance hangs under the circle.
export default function ScorebugSnf({ bc, home, away, st, rec = {}, pop, className = '', left, down, quarter }) {
  const side = (t, s) => (
    <div className={`snf-side ${s}${st?.possession === t.id ? ' ball' : ''}`} style={{ '--tc': t.color }}>
      <img className="snf-logo" src={t.logo} alt="" />
      <div className="snf-id"><b>{t.code}</b><small>{recordText(rec[t.id])}</small></div>
      <div className="snf-score"><ScoreNum value={st?.[`${s}_score`] ?? 0} /><span className="sb-tos">{[0, 1, 2].map((i) => <i key={i} className={i < (st?.[`${s}_timeouts`] ?? 3) ? 'on' : ''} />)}</span></div>
    </div>
  );
  return (
    <div className={`sb sb-snf ${className}`}>
      <div className="sb-pop">{pop}</div>
      <div className="snf">
        {side(away, 'away')}
        <div className="snf-circle">
          <img src={bc.net.logo} alt="" />
          <b>{clockText(left)}</b>
          <span><i>{quarter}</i><i>{st?.play_clock ?? 40}</i></span>
        </div>
        {side(home, 'home')}
        <span className="snf-down">{down}</span>
      </div>
    </div>
  );
}
