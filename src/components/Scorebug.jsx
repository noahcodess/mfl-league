import React from 'react';
import ScoreNum from './ScoreNum.jsx';
import ScorebugTnf from './ScorebugTnf.jsx';
import ScorebugSnf from './ScorebugSnf.jsx';
import { useTicker, clockLeft, clockText, quarterText, downText } from '../data/gameState.js';

export const Pips = ({ n = 3 }) => <span className="sb-tos" title={`${n} timeouts left`}>{[0, 1, 2].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}</span>;

function Team({ t, side, st }) {
  return (
    <div className={`sb-team ${side}${st?.possession === t.id ? ' ball' : ''}`} style={{ '--tc': t.color, '--ta': t.accent }}>
      <img className="sb-logo" src={t.logo} alt="" />
      <div className="sb-id"><span className="sb-code">{t.code}</span><Pips n={st?.[`${side}_timeouts`] ?? 3} /></div>
      <ScoreNum className="sb-score" value={st?.[`${side}_score`] ?? 0} />
      {st?.possession === t.id && <span className="sb-ball" title="Has the ball" />}
    </div>
  );
}

// The broadcast scorebug for a game, in its program's own shape: FOX (slanted black bar, gold chevron clock), CBS (square white
// bar), ESPN for Saturday and Monday night (angled slate with red glow), TNF (compact rounded box) and SNF (bar with a circle).
// Shows both teams (logo, abbreviation, timeouts, score, ball), quarter, game clock, play clock, down and distance.
// pop: the space above the bug where stat pop-outs (completion %, drive summary) will slide out later.
export default function Scorebug(props) {
  const { bc, home, away, st, pop = null, className = '' } = props;
  useTicker(st?.clock_running);
  const parts = { left: clockLeft(st), status: st?.status || 'pregame', down: downText(st), quarter: st?.status === 'final' ? 'Final' : quarterText(st?.quarter || 1) };
  if (bc.bug === 'tnf') return <ScorebugTnf {...props} {...parts} />;
  if (bc.bug === 'snf') return <ScorebugSnf {...props} {...parts} />;
  return (
    <div className={`sb sb-${bc.bug} ${className}`}>
      <div className="sb-pop">{pop}</div>
      <div className="sb-bar">
        <span className="sb-net"><img src={bc.prime ? bc.logo : bc.net.logo} alt="" /></span>
        <Team t={away} side="away" st={st} />
        <Team t={home} side="home" st={st} />
        <div className="sb-time">
          <span className="sb-q">{parts.quarter}</span>
          <span className="sb-clock">{clockText(parts.left)}</span>
          <span className="sb-play">{st?.play_clock ?? 40}</span>
        </div>
        <div className="sb-down">{parts.down}</div>
      </div>
    </div>
  );
}
