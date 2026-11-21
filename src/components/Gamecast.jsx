import React, { useEffect, useMemo, useState } from 'react';
import BoxScore from './BoxScore.jsx';
import { finalText } from '../data/gameState.js';

const clock = (c) => `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`;
const ORD = ['', '1st', '2nd', '3rd', '4th'], qName = (q) => (q > 4 ? (q === 5 ? 'OT' : `OT${q - 4}`) : `Q${q}`);
const spot = (on) => (on === 50 ? '50' : on < 50 ? `own ${on}` : `opp ${100 - on}`);

// Watch a simmed game one play at a time: score, clock, down and distance, the ball moving on a field strip, the hidden
// momentum meter, the call on every play, then the box score. It reads the engine's play reports and nothing else.
// The real pixel broadcast replaces this later; this is how to watch games until then.
// finished: open on the final score with the box score showing (Quick Sim).
export default function Gamecast({ game, teams, names, finished = false }) {
  const last = game.plays.length - 1;
  const [i, setI] = useState(finished ? last : 0), [on, setOn] = useState(!finished), [speed, setSpeed] = useState(1), [tab, setTab] = useState(finished ? 'box' : 'plays');
  const play = game.plays[Math.min(i, last)], done = i >= last;
  useEffect(() => { setI(finished ? game.plays.length - 1 : 0); setOn(!finished); }, [game]);
  useEffect(() => {
    if (!on || done) return undefined;
    const wait = (play.headline ? 2600 : play.kind === 'penalty' || play.kind === 'xp' ? 1100 : 1700) / speed;
    const t = setTimeout(() => setI((n) => Math.min(last, n + 1)), wait);
    return () => clearTimeout(t);
  }, [i, on, speed, done]);
  const a = play.after || {}, sc = a.score || play.before.score, abs = (side, yd) => (side === 'away' ? yd : 100 - yd);
  const ball = abs(a.poss ?? play.off, a.ballOn ?? play.before.ballOn), line = a.poss && a.toGo ? abs(a.poss, Math.min(100, a.ballOn + a.toGo)) : null;
  const recent = useMemo(() => game.plays.slice(Math.max(0, i - 7), i + 1).reverse(), [game, i]);
  const team = (k) => (
    <div className={`gc-team${a.poss === k && !done ? ' has' : ''}`} style={{ '--tc': teams[k].color }}>
      <img src={teams[k].logo} alt="" /><b>{teams[k].name}</b><span className="gc-score">{sc[k]}</span>
    </div>
  );
  return (
    <div className="gc">
      <div className="gc-top">{team('away')}<div className="gc-mid"><b>{done ? finalText(4 + (game.overtimes || 0)).toUpperCase() : `${qName(a.quarter || play.before.quarter)} ${a.quarter > 4 ? '' : clock(a.clock ?? play.before.clock)}`}</b>
        <small>{done ? '' : a.poss ? `${ORD[a.down] || ''} & ${a.toGo} · ${spot(a.ballOn)}` : ''}</small></div>{team('home')}</div>
      <div className="gc-field" style={{ '--away': teams.away.color, '--home': teams.home.color }}>
        <i className="gc-ez away">{teams.away.id.toUpperCase()}</i><i className="gc-ez home">{teams.home.id.toUpperCase()}</i>
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => <i key={y} className="gc-yard" style={{ left: `${8 + y * 0.84}%` }}><em>{y <= 50 ? y : 100 - y}</em></i>)}
        {line != null && <i className="gc-first" style={{ left: `${8 + line * 0.84}%` }} />}
        <i className={`gc-ball${play.result?.td ? ' td' : ''}`} style={{ left: `${8 + ball * 0.84}%`, '--tc': teams[a.poss || play.off].color }}>🏈</i>
      </div>
      <div className="gc-mom" title="Momentum (hidden from coaches)"><span>{teams.away.id.toUpperCase()}</span><div><i style={{ left: `${50 + (a.mom || 0) * 50}%` }} /></div><span>{teams.home.id.toUpperCase()}</span></div>
      <div className={`gc-now${play.headline ? ' big' : ''}`} key={i}>{play.headline && <b>{play.headline}</b>}<p>{play.text}</p>
        {play.call?.type && <small>{teams[play.off].id.toUpperCase()} called {play.call.name || play.call.type}{play.defCall ? ` · defense: ${play.defCall.name || play.defCall.cov}${play.defCall.blitz ? ' (blitz)' : ''}` : ''}{play.keyPlay ? ' · 🔑 key play' : ''}</small>}</div>
      <div className="gc-ctl">
        <button className="btn small ghost" onClick={() => { setOn(false); setI(Math.max(0, i - 1)); }}>⏮</button>
        <button className="btn small" onClick={() => setOn(!on)}>{on && !done ? '⏸ Pause' : '▶ Play'}</button>
        <button className="btn small ghost" onClick={() => { setOn(false); setI(Math.min(last, i + 1)); }}>⏭</button>
        {[1, 2, 5].map((s) => <button key={s} className={`btn small${speed === s ? '' : ' ghost'}`} onClick={() => setSpeed(s)}>{s}x</button>)}
        <button className="btn small ghost" onClick={() => { setOn(false); setI(last); }}>Skip to the end</button>
        <span className="dim">Play {i + 1} of {last + 1}</span>
      </div>
      <div className="bx-tabs">{[['plays', 'Play-by-play'], ['box', 'Box score'], ['scoring', 'Scoring plays']].map(([k, name]) => <button key={k} className={`btn small${tab === k ? '' : ' ghost'}`} onClick={() => setTab(k)}>{name}</button>)}</div>
      {tab === 'plays' && <ol className="gc-log">{recent.map((p) => <li key={p.n} className={p.headline ? 'hl' : ''}><span>{qName(p.before.quarter)} {p.before.quarter > 4 ? '' : clock(p.before.clock)} · {teams[p.off].id.toUpperCase()}</span>{p.text}</li>)}</ol>}
      {tab === 'box' && (done ? <BoxScore game={game} names={names} teams={teams} /> : <p className="dim">The box score opens when the game ends. Hit "Skip to the end" to see it now.</p>)}
      {tab === 'scoring' && <ol className="gc-log">{game.scoring.filter((x) => x.n <= i + 1).map((x) => <li key={x.n + x.how}><span>{qName(x.quarter)} {x.quarter > 4 ? '' : clock(x.clock)} · {teams[x.side].id.toUpperCase()} +{x.pts}</span>{x.how}: {game.plays[x.n - 1]?.text}</li>)}</ol>}
      {done && game.injuries.length > 0 && <p className="gc-inj">🩹 Injuries: {game.injuries.map((x) => `${x.name} (${x.weeks} week${x.weeks > 1 ? 's' : ''})`).join(', ')}</p>}
    </div>
  );
}
