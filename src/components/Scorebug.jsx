import React from 'react';
import ScoreNum from './ScoreNum.jsx';
import ScorebugTnf from './ScorebugTnf.jsx';
import ScorebugSnf from './ScorebugSnf.jsx';
import { useTicker, clockLeft, clockText, quarterText, downText } from '../data/gameState.js';
import { recordText } from '../lib/seasonStats.js';

// Who has the ball, in each program's own way: FOX a gold arrow, CBS a thin navy arrow, ESPN a detailed football.
// (TNF lights one of two arrows behind its clock; SNF puts a pointer on its circle.)
function Possession({ bug }) {
  if (bug === 'espn') {
    return (
      <svg className="sb-football" viewBox="0 0 24 14" aria-label="Has the ball">
        <ellipse cx="12" cy="7" rx="11" ry="6" fill="#7a3d14" stroke="#2b1306" strokeWidth="1.2" />
        <ellipse cx="9" cy="5" rx="6" ry="2.3" fill="#b5652b" opacity=".7" />
        <path d="M3.2 4.2 Q4 7 3.2 9.8 M20.8 4.2 Q20 7 20.8 9.8" stroke="#fff" strokeWidth="1" fill="none" />
        <path d="M8 7 H16" stroke="#fff" strokeWidth="1.1" />
        {[9, 10.7, 12.4, 14.1].map((x) => <path key={x} d={`M${x} 5.6 V8.4`} stroke="#fff" strokeWidth=".9" />)}
      </svg>
    );
  }
  return <span className={`sb-arrow ${bug}`} aria-label="Has the ball" />;
}
export const Pips = ({ n = 3 }) => <span className="sb-tos" title={`${n} timeouts left`}>{[0, 1, 2].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}</span>;

function Team({ t, side, st, rec, bug }) {
  return (
    <div className={`sb-team ${side}${st?.possession === t.id ? ' ball' : ''}`} style={{ '--tc': t.color, '--ta': t.accent }}>
      <img className="sb-logo" src={t.logo} alt="" />
      <div className="sb-id"><span className="sb-line"><span className="sb-code">{t.code}</span>{st?.possession === t.id && <Possession bug={bug} />}</span>
        <span className="sb-line"><small className="sb-rec">{recordText(rec?.[t.id])}</small><Pips n={st?.[`${side}_timeouts`] ?? 3} /></span></div>
      <ScoreNum className="sb-score" value={st?.[`${side}_score`] ?? 0} />
    </div>
  );
}

// The broadcast scorebug for a game, in its program's own shape: FOX (slanted black bar, gold chevron clock), CBS (square white
// bar), ESPN for Saturday and Monday night (angled slate with red glow), TNF (compact rounded box) and SNF (bar with a circle).
// Shows both teams (logo, abbreviation, record, timeouts, score, a marker for who has the ball), quarter, game
// clock, play clock, down and distance. rec: { teamId: record } for the records.
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
        <Team t={away} side="away" st={st} rec={props.rec} bug={bc.bug} />
        <Team t={home} side="home" st={st} rec={props.rec} bug={bc.bug} />
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
