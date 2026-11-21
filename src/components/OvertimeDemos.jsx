// The little animated demos on the overtime rules cards: the coin, the turn-order timeline, the field and the shootout.
import React from 'react';
import { quarterText } from '../data/gameState.js';

const START = 70;   // overtime starts at the other team's 30 (70 yards from your own goal)
const at = (y) => `calc(8.33% + ${y} * .8333%)`;

// One coin flip: the winner's logo lands face up.
export const Coin = ({ win, lose }) => (
  <div className="ot-coin"><span className="ot-coin-in"><img src={lose.logo} alt="" /><img src={win.logo} alt="" /></span></div>
);

// Who goes first each overtime: OT, OT2, OT3, OT4 ... alternating, then "and so on".
export function Turns({ a, b }) {
  return (
    <div className="ott">
      {[1, 2, 3, 4].map((n) => {
        const f = n % 2 ? a : b, s = n % 2 ? b : a;
        return (
          <div key={n} className="ott-ot" style={{ animationDelay: `${0.25 + n * 0.45}s` }}>
            <b className="hf">{quarterText(4 + n)}</b>
            <span className="ott-pair">
              <span className="ott-t first" style={{ '--tc': f.color }}><img src={f.logo} alt="" /><small>1st</small></span>
              <span className="ott-t" style={{ '--tc': s.color }}><img src={s.logo} alt="" /><small>2nd</small></span>
            </span>
          </div>
        );
      })}
      <div className="ott-more hf" style={{ animationDelay: '2.4s' }}>…</div>
    </div>
  );
}

// A strip of field: the ball (a team logo) starts on the other team's 30 and drives in. mode: drive | two.
export function MiniField({ team, other, mode }) {
  return (
    <div className={`otf otf-${mode}`} style={{ '--tc': team.color, '--oc': other.color, '--start': at(START) }}>
      <div className="otf-ez left" /><div className="otf-ez right"><img src={other.logo} alt="" /></div>
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => <i key={y} className={`otf-yd${y === START ? ' on' : ''}`} style={{ left: at(y) }}>{y <= 50 ? y : 100 - y}</i>)}
      <i className="otf-start" /><span className="otf-tag hf">Start: their 30</span>
      <span className="otf-ball"><img src={team.logo} alt="" /></span>
      {mode === 'two' && <b className="otf-go2 hf">TD → go for 2</b>}
    </div>
  );
}

// The two-point shootout: each round is its own overtime. OT3 both make it, OT4 the first team misses and the second wins.
export function Shootout({ a, b }) {
  const rounds = [[7, [[a, true], [b, true]], 'Still tied'], [8, [[b, false], [a, true]], `${a.code} win`]];
  return (
    <div className="ots">
      {rounds.map(([q, tries, end], r) => (
        <div key={q} className="ots-round" style={{ animationDelay: `${0.4 + r * 1.6}s` }}>
          <b className="hf">{quarterText(q)}</b>
          {tries.map(([t, ok], k) => (
            <span key={k} className={`ots-try ${ok ? 'ok' : 'no'}`} style={{ '--tc': t.color, animationDelay: `${0.8 + r * 1.6 + k * 0.5}s` }}><img src={t.logo} alt="" /><i className="hf">{ok ? '✓' : '✗'}</i></span>
          ))}
          <em style={{ animationDelay: `${1.8 + r * 1.6}s` }}>{end}</em>
        </div>
      ))}
    </div>
  );
}
