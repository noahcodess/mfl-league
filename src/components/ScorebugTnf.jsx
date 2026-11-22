import React from 'react';
import ScoreNum from './ScoreNum.jsx';
import ScorebugCard from './ScorebugCard.jsx';
import DownText from './DownText.jsx';
import { recordText } from '../lib/seasonStats.js';
import { toSlots } from '../data/gameState.js';

const Pips = ({ n, q }) => <i className="sb-tos">{toSlots(q).map((i) => <i key={i} className={i < n ? 'on' : ''} />)}</i>;

// TNF's scorebug: a rounded box like the TNF logo. Each side wears that team's own color gradient, and the logos sit on top
// with no box behind them, breaking out over the edge. The middle is all clock: down and distance, quarter, game clock and
// play clock. The background is two arrows; the lit one points at the team with the ball. Abbreviations come with records and timeouts.
export default function ScorebugTnf({ home, away, st, rec, pop, card, className = '', clock, down, quarter, pc }) {
  const side = (t, s) => (
    <div className={`tnf-side ${s}${st?.possession === t.id ? ' ball' : ''}`} style={{ '--tc': t.color, '--ta': t.accent }}>
      <img className="tnf-logo" src={t.logo} alt="" />
      <div className="tnf-id"><span>{t.code}</span><small>{recordText(rec?.[t.id])}</small><Pips n={st?.[`${s}_timeouts`] ?? 3} q={st?.quarter} /></div>
      <ScoreNum className="tnf-score" value={st?.[`${s}_score`] ?? 0} />
      {card?.side === s && <ScorebugCard card={card} />}
    </div>
  );
  return (
    <div className={`sb sb-tnf${st?.quarter >= 5 ? ' sb-ot' : ''}${st?.flag ? ' sb-flagged' : ''} ${className}`}>
      <div className="sb-pop">{pop}</div>
      <div className="tnf">
        {side(away, 'away')}
        <div className={`tnf-mid${st?.possession === away.id ? ' poss-away' : st?.possession === home.id ? ' poss-home' : ''}`}>
          <i className="tnf-arrow l" aria-hidden="true" /><i className="tnf-arrow r" aria-hidden="true" />
          <span className="tnf-down"><DownText text={down} /></span>
          <span className="tnf-time"><span className="sb-qx" key={quarter}>{quarter}</span>{clock && <b>{clock}</b>}{pc !== '' && <em>{pc}</em>}</span>
        </div>
        {side(home, 'home')}
      </div>
    </div>
  );
}
