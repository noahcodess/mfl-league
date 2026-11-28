import React from 'react';
import Headshot from './Headshot.jsx';

// The end-of-game show's graphics after the highlights (see postGameSlides for which ones run): the final numbers, the
// matchup of the game (each side's best player, face to face) and the game flow (the margin drawn over the whole game).
// teams: { home, away }. people: id -> player.

// lines: [label, away, home, away share] from teamLines over the whole game.
export function PostNumbers({ lines, teams }) {
  return (
    <div className="ht-stats">
      <h3 className="hf">Final numbers</h3>
      <div className="ht-heads">{['away', 'home'].map((k) => <span key={k}><img src={teams[k].logo} alt="" />{teams[k].code}</span>)}</div>
      {lines.map(([label, a, h, share], n) => (
        <div className="ht-line" key={label} style={{ animationDelay: `${0.25 + n * 0.3}s`, '--a': teams.away.color, '--h': teams.home.color, '--share': share }}>
          <b>{a}</b><div className="ht-bar"><i /><span><em>{label}</em></span></div><b>{h}</b>
        </div>
      ))}
    </div>
  );
}

// pick: { best: [away player, home player] (from playerOfGame), margin, ot }. win: the winning side.
export function PostMatchup({ pick, teams, people, win }) {
  const sub = pick.ot ? `Settled in overtime` : pick.margin <= 3 ? `Decided by ${pick.margin}` : `A ${pick.margin}-point game`;
  return (
    <div className="pgm">
      <span className="htc-kick hf">Matchup of the game</span>
      <div className="pgm-row">
        {pick.best.map((b, n) => {
          const side = n ? 'home' : 'away', p = people[b.player_id], t = teams[side];
          return (
            <div key={side} className={`pgm-card${side === win ? ' won' : ''}`} style={{ '--tc': t.color, animationDelay: `${0.2 + n * 0.25}s` }}>
              {p && <Headshot player={p} team={t} size={140} />}
              <b className="hf">{p?.name || '?'}</b>
              <small><img src={t.logo} alt="" />{t.code} · {p?.pos}</small>
              <span className="pgm-feat hf">{b.feat}</span><p>{b.line}</p>
            </div>
          );
        })}
        <span className="pgm-vs hf">VS</span>
      </div>
      <p className="pgm-sub">{sub}</p>
    </div>
  );
}

// pick: { flow: { pts: [{ k, m }], qs: [{ k, q }], n }, win, deficit, changes }.
export function PostFlow({ pick, teams }) {
  const { pts, qs, n } = pick.flow, top = Math.max(7, ...pts.map((p) => Math.abs(p.m))), W = 600, H = 220, x = (k) => (k / Math.max(1, n)) * W, y = (m) => H / 2 - (m / top) * (H / 2 - 12);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.k).toFixed(1)},${y(p.m).toFixed(1)}`).join(' '), area = `${line} L${W},${H / 2} L0,${H / 2} Z`;
  const winner = teams[pick.win], title = pick.deficit >= 10 ? `Comeback: ${winner.name} were down ${pick.deficit}` : `Back and forth: ${pick.changes} lead changes`;
  return (
    <div className="pgf">
      <span className="htc-kick hf">Game flow</span>
      <b className="pgf-title hf">{title}</b>
      <div className="pgf-chart">
        <span className="pgf-team top"><img src={teams.home.logo} alt="" />{teams.home.code} ahead</span>
        <svg viewBox={`0 0 ${W} ${H}`}>
          <defs><clipPath id="pgf-up"><rect x="0" y="0" width={W} height={H / 2} /></clipPath><clipPath id="pgf-dn"><rect x="0" y={H / 2} width={W} height={H / 2} /></clipPath></defs>
          {qs.map((q) => <g key={q.k}><line x1={x(q.k)} x2={x(q.k)} y1="0" y2={H} className="pgf-q" /><text x={x(q.k) + 4} y="14" className="pgf-ql">{q.q >= 5 ? 'OT' : `Q${q.q}`}</text></g>)}
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="pgf-zero" />
          <path d={area} clipPath="url(#pgf-up)" style={{ fill: teams.home.color }} className="pgf-area" />
          <path d={area} clipPath="url(#pgf-dn)" style={{ fill: teams.away.color }} className="pgf-area" />
          <path d={line} className="pgf-line" pathLength="1" />
        </svg>
        <span className="pgf-team bot"><img src={teams.away.logo} alt="" />{teams.away.code} ahead</span>
      </div>
    </div>
  );
}
