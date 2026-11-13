import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PlayArt from './PlayArt.jsx';
import { keyPlayOptions, momentText } from '../lib/keyPlays.js';

const KEY = ['..####..........', '.######.........', '###..############', '###..############', '.######.....##.##', '..####......##.##'];
const PICK_SECONDS = 20;

export function PixelKey({ className = 'kp-key' }) {
  return (
    <svg className={className} viewBox="-1 -1 19 8" shapeRendering="crispEdges" aria-hidden="true">
      {KEY.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`s${x}-${y}`} x={x + 0.35} y={y + 0.35} width="1" height="1" fill="#6b4a00" /> : null)))}
      {KEY.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={y < 2 ? '#fff0a8' : y < 4 ? '#ffd23f' : '#e0a800'} /> : null)))}
    </svg>
  );
}

// A key play: a pixel key flies in with KEY PLAY (under 3 seconds) and flies out, then the coach picks one of the four most
// sensible plays, each with its play art, before the timer runs out. moment: { down, togo, ballOn, quarter, clock }.
export default function KeyPlayOverlay({ moment, team, onPick, onClose }) {
  const [phase, setPhase] = useState('intro'), [left, setLeft] = useState(PICK_SECONDS), [called, setCalled] = useState(null);
  const options = keyPlayOptions(moment);
  useEffect(() => { const t = setTimeout(() => setPhase('pick'), 2700); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (phase !== 'pick') return undefined;
    if (left <= 0) { setCalled({ name: 'No call', auto: true }); setPhase('called'); return undefined; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);
  useEffect(() => { if (phase !== 'called') return undefined; const t = setTimeout(onClose, 1800); return () => clearTimeout(t); }, [phase, onClose]);
  const pick = (p) => { setCalled(p); setPhase('called'); onPick?.(p); };
  return createPortal(
    <div className={`kp-overlay kp-phase-${phase}`} style={{ '--tc': team.color }}>
      {phase === 'intro' && <div className="kp-intro"><PixelKey /><b className="kp-word">Key play</b></div>}
      {phase === 'pick' && (
        <div className="kp-pick">
          <header><b>🔑 Key play</b><span>{momentText(moment)}</span></header>
          <div className="kp-timer"><i style={{ width: `${(left / PICK_SECONDS) * 100}%` }} /><span>{left}s to pick</span></div>
          <div className="kp-options">
            {options.map((p, i) => (
              <button key={p.key} className="kp-card" style={{ '--i': i }} onClick={() => pick(p)}>
                <PlayArt play={p} color={team.color} id={p.key} />
                <b>{p.name}</b><small>{p.tag}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {phase === 'called' && <div className="kp-called">{called?.auto ? '⏱ Time ran out. The default play runs.' : <>✅ Play called: <b>{called?.name}</b></>}</div>}
    </div>,
    document.body,
  );
}
