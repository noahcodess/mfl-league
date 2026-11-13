import React from 'react';
import ScoreNum from './ScoreNum.jsx';
import { clockText } from '../data/gameState.js';
import { recordText } from '../lib/seasonStats.js';

// SNF's scorebug: a long night-blue bar that tapers at both ends with a circle in the middle (like NBC's real one), silver
// edges and a peacock stripe. Big logos at the ends, abbreviation and record, score boxes with timeouts under them; the circle
// holds the quarter, the game clock and the play clock, and its outline IS the play clock: the ring empties as it ticks down
// (red at 5 seconds). Down and distance hangs under the circle; a football arrow points at who has the ball.
export default function ScorebugSnf({ home, away, st, rec = {}, pop, className = '', left, down, quarter }) {
  const pc = st?.play_clock ?? 40;
  const side = (t, s) => (
    <div className={`snf-side ${s}${st?.possession === t.id ? ' ball' : ''}`} style={{ '--tc': t.color }}>
      <i className="snf-plate" aria-hidden="true" />
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
        <div className={`snf-circle${pc <= 5 ? ' low' : ''}`} style={{ '--pc': pc / 40 }}>
          {st?.possession === away.id && <span className="sb-poss left snf-poss" title="Has the ball"><i /></span>}
          {st?.possession === home.id && <span className="sb-poss right snf-poss" title="Has the ball"><i /></span>}
          <small>{quarter}</small>
          <b>{clockText(left)}</b>
          <span>{pc}</span>
        </div>
        {side(home, 'home')}
        <span className="snf-down">{down}</span>
      </div>
    </div>
  );
}
