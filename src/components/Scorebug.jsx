import React from 'react';
import { useTicker, clockLeft, clockText, quarterText } from '../data/gameState.js';

function Team({ t, side, st }) {
  const tos = st?.[`${side}_timeouts`] ?? 3, ball = st?.possession === t.id;
  return (
    <div className={`sb-team ${side}${ball ? ' ball' : ''}`} style={{ '--tc': t.color, '--ta': t.accent }}>
      <img className="sb-logo" src={t.logo} alt="" />
      <div className="sb-id"><span className="sb-code">{t.code}</span><span className="sb-tos" title={`${tos} timeouts left`}>{[0, 1, 2].map((i) => <i key={i} className={i < tos ? 'on' : ''} />)}</span></div>
      <span className="sb-score">{st?.[`${side}_score`] ?? 0}</span>
      {ball && <span className="sb-ball" title="Has the ball" />}
    </div>
  );
}

// TNF's bug: a compact rounded box like its logo. Logos on the outside, scores next to them, and down and distance over the
// quarter, clock and play clock in the middle, with the TNF logo on top.
function CompactBug({ bc, home, away, st, pop, className, left, status, down }) {
  const team = (t, side) => {
    const tos = st?.[`${side}_timeouts`] ?? 3;
    return (
      <div className={`sbc-team ${side}${st?.possession === t.id ? ' ball' : ''}`} style={{ '--tc': t.color }}>
        <img src={t.logo} alt="" /><span>{t.code}</span><i className="sb-tos">{[0, 1, 2].map((n) => <i key={n} className={n < tos ? 'on' : ''} />)}</i>
      </div>
    );
  };
  return (
    <div className={`sb sb-tnf sb-compact ${className}`}>
      <div className="sb-pop">{pop}</div>
      <div className="sbc">
        <img className="sbc-logo" src={bc.logo} alt="" />
        {team(away, 'away')}
        <b className="sbc-score">{st?.away_score ?? 0}</b>
        <div className="sbc-mid">
          <span className="sbc-down">{down}</span>
          <span className="sbc-time"><span>{status === 'final' ? 'Final' : quarterText(st?.quarter || 1)}</span><b>{clockText(left)}</b><span className="sb-play">{st?.play_clock ?? 40}</span></span>
        </div>
        <b className="sbc-score">{st?.home_score ?? 0}</b>
        {team(home, 'home')}
      </div>
    </div>
  );
}

// The broadcast scorebug for a game, in its program's design (FOX, CBS, TNF, SNF, or ESPN for Saturday and Monday night):
// both teams (logo, abbreviation, timeouts left, score, ball marker), quarter, game clock, play clock, and down and distance.
// pop: the space above the bar where stat pop-outs (completion %, drive summary) will slide out later.
// Each program has its own shape: FOX, CBS, SNF and ESPN are long bars; TNF is a compact rounded box (CompactBug).
export default function Scorebug({ bc, home, away, st, pop = null, className = '' }) {
  useTicker(st?.clock_running);
  const left = clockLeft(st), status = st?.status || 'pregame';
  const down = st?.down ? `${st.down} & ${st.togo}` : status === 'pregame' ? 'Pregame' : status === 'final' ? 'Final' : 'Kickoff';
  if (bc.bug === 'tnf') return <CompactBug bc={bc} home={home} away={away} st={st} pop={pop} className={className} left={left} status={status} down={down} />;
  return (
    <div className={`sb sb-${bc.bug} ${className}`}>
      <div className="sb-pop">{pop}</div>
      <div className="sb-bar">
        <span className="sb-net"><img src={bc.prime ? bc.logo : bc.net.logo} alt="" /></span>
        <Team t={away} side="away" st={st} />
        <Team t={home} side="home" st={st} />
        <div className="sb-time">
          <span className="sb-q">{status === 'final' ? 'Final' : quarterText(st?.quarter || 1)}</span>
          <span className="sb-clock">{clockText(left)}</span>
          <span className="sb-play">{st?.play_clock ?? 40}</span>
        </div>
        <div className="sb-down">{down}</div>
      </div>
    </div>
  );
}
