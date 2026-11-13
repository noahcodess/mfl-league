import React from 'react';
import ScoreNum from './ScoreNum.jsx';
import { clockText } from '../data/gameState.js';

const Pips = ({ n }) => <i className="sb-tos">{[0, 1, 2].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}</i>;

// TNF's scorebug: a compact rounded box like the TNF logo. Each side wears that team's own color gradient, and the logos sit
// on top with no box behind them, breaking out over the edge. Down and distance, quarter, clock and play clock in the middle,
// the TNF logo on top.
export default function ScorebugTnf({ bc, home, away, st, pop, className = '', left, down, quarter }) {
  const side = (t, s) => (
    <div className={`tnf-side ${s}${st?.possession === t.id ? ' ball' : ''}`} style={{ '--tc': t.color, '--ta': t.accent }}>
      <img className="tnf-logo" src={t.logo} alt="" />
      <div className="tnf-id"><span>{t.code}</span><Pips n={st?.[`${s}_timeouts`] ?? 3} /></div>
      <ScoreNum className="tnf-score" value={st?.[`${s}_score`] ?? 0} />
    </div>
  );
  return (
    <div className={`sb sb-tnf ${className}`}>
      <div className="sb-pop">{pop}</div>
      <div className="tnf">
        <img className="tnf-show" src={bc.logo} alt="" />
        {side(away, 'away')}
        <div className="tnf-mid">
          <span className="tnf-down">{down}</span>
          <span className="tnf-time"><span>{quarter}</span><b>{clockText(left)}</b><em>{st?.play_clock ?? 40}</em></span>
        </div>
        {side(home, 'home')}
      </div>
    </div>
  );
}
