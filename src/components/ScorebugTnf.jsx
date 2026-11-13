import React from 'react';
import ScoreNum from './ScoreNum.jsx';
import { clockText } from '../data/gameState.js';
import { recordText } from '../lib/seasonStats.js';

const Pips = ({ n }) => <i className="sb-tos">{[0, 1, 2].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}</i>;

// TNF's scorebug: a rounded box like the TNF logo. Each side wears that team's own color gradient, and the logos sit on top
// with no box behind them, breaking out over the edge. The middle is all clock: down and distance, quarter, game clock and
// play clock. The background is two arrows; the lit one points at the team with the ball. Abbreviations come with records and timeouts.
export default function ScorebugTnf({ home, away, st, rec, pop, className = '', left, down, quarter }) {
  const side = (t, s) => (
    <div className={`tnf-side ${s}${st?.possession === t.id ? ' ball' : ''}`} style={{ '--tc': t.color, '--ta': t.accent }}>
      <img className="tnf-logo" src={t.logo} alt="" />
      <div className="tnf-id"><span>{t.code}</span><small>{recordText(rec?.[t.id])}</small><Pips n={st?.[`${s}_timeouts`] ?? 3} /></div>
      <ScoreNum className="tnf-score" value={st?.[`${s}_score`] ?? 0} />
    </div>
  );
  return (
    <div className={`sb sb-tnf ${className}`}>
      <div className="sb-pop">{pop}</div>
      <div className="tnf">
        {side(away, 'away')}
        <div className={`tnf-mid${st?.possession === away.id ? ' poss-away' : st?.possession === home.id ? ' poss-home' : ''}`}>
          <i className="tnf-arrow l" aria-hidden="true" /><i className="tnf-arrow r" aria-hidden="true" />
          <span className="tnf-down">{down}</span>
          <span className="tnf-time"><span>{quarter}</span><b>{clockText(left)}</b><em>{st?.play_clock ?? 40}</em></span>
        </div>
        {side(home, 'home')}
      </div>
    </div>
  );
}
