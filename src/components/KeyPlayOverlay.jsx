import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PlayArt from './PlayArt.jsx';
import { keyPlayOptions, momentText, KEY_PLAY_SLOTS } from '../lib/keyPlays.js';

const KEY = ['..####..........', '.######.........', '###..############', '###..############', '.######.....##.##', '..####......##.##'];
const PICK_SECONDS = 25;
const ORD = ['1st', '2nd', '3rd', '4th'];

export function PixelKey({ className = 'kp-key' }) {
  return (
    <svg className={className} viewBox="-1 -1 19 8" shapeRendering="crispEdges" aria-hidden="true">
      {KEY.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`s${x}-${y}`} x={x + 0.35} y={y + 0.35} width="1" height="1" fill="#6b4a00" /> : null)))}
      {KEY.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={y < 2 ? '#fff0a8' : y < 4 ? '#ffd23f' : '#e0a800'} /> : null)))}
    </svg>
  );
}

// A key play: a pixel key flies in with KEY PLAY (under 3 seconds) and out, then the coach has 25 seconds to pick from up to
// eight plays (best first), each with play art. The pick shows for about 2 seconds, then it all goes away.
// moment: { down, togo, ballOn, quarter, clock }.
export default function KeyPlayOverlay({ moment, team, onPick, onClose }) {
  const [phase, setPhase] = useState('intro'), [left, setLeft] = useState(PICK_SECONDS), [called, setCalled] = useState(null);
  const close = useRef(onClose); close.current = onClose; // the room re-renders every second; keep the timers steady
  const options = keyPlayOptions(moment), blanks = Math.max(0, KEY_PLAY_SLOTS - options.length);
  useEffect(() => { const t = setTimeout(() => setPhase('pick'), 2700); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (phase !== 'pick') return undefined;
    if (left <= 0) { setCalled({ name: 'No call', auto: true }); setPhase('called'); return undefined; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);
  useEffect(() => { if (phase !== 'called') return undefined; const t = setTimeout(() => close.current(), 2000); return () => clearTimeout(t); }, [phase]);
  const pick = (p) => { setCalled(p); setPhase('called'); onPick?.(p); };
  const toGoal = 100 - moment.ballOn;
  return createPortal(
    <div className={`kp-overlay kp-phase-${phase}`} style={{ '--tc': team.color }}>
      {phase === 'intro' && <div className="kp-intro"><PixelKey /><b className="kp-word">Key play</b></div>}
      {phase === 'pick' && (
        <div className="kp-pick">
          <header className="kp-head">
            <div className="kp-title"><PixelKey className="kp-mini-key" /><b>Key play</b></div>
            <div className="kp-moment"><b>{ORD[moment.down - 1]} &amp; {toGoal <= moment.togo ? 'Goal' : moment.togo}</b><span>{momentText(moment).split(' · ').slice(1).join(' · ')}</span></div>
            <div className={`kp-ring${left <= 5 ? ' low' : ''}`} style={{ '--k': left / PICK_SECONDS }}><b>{left}</b><small>sec</small></div>
          </header>
          <div className="kp-options">
            {options.map((p, i) => (
              <button key={p.key} className={`kp-card g-${p.group.toLowerCase()}`} style={{ '--i': i }} onClick={() => pick(p)}>
                <span className="kp-chip">{p.group}</span>
                <PlayArt play={p} color={team.color} id={p.key} />
                <b>{p.name}</b><small>{p.tag}</small>
              </button>
            ))}
            {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} className="kp-card kp-blank" style={{ '--i': options.length + i }}><span>More plays coming</span></div>)}
          </div>
        </div>
      )}
      {phase === 'called' && <div className="kp-called">{called?.auto ? '⏱ Time ran out. The default play runs.' : <>✅ Play called: <b>{called?.name}</b></>}</div>}
    </div>,
    document.body,
  );
}
