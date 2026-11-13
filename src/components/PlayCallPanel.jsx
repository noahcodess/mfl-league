import React, { useState } from 'react';

const PLAYS = {
  Offense: [['🏃', 'Run inside'], ['↗️', 'Run outside'], ['🎯', 'Short pass'], ['🚀', 'Deep pass'], ['🧱', 'Screen'], ['🎭', 'Play action'], ['💪', 'QB sneak'], ['🦵', 'Punt'], ['🥅', 'Field goal']],
  Defense: [['🛡️', 'Base'], ['⚡', 'Blitz'], ['2️⃣', 'Cover 2'], ['3️⃣', 'Cover 3'], ['👤', 'Man'], ['🧯', 'Prevent'], ['🚧', 'Goal line']],
};

// Coaching room: the play calls. Layout only for now (every button is off); play calling comes with the game engine.
export default function PlayCallPanel() {
  const [side, setSide] = useState('Offense');
  return (
    <section className="cr-card cr-plays">
      <header><b>📋 Play call</b><div className="lv-tabs">{Object.keys(PLAYS).map((k) => <button key={k} className={k === side ? 'on' : ''} onClick={() => setSide(k)}>{k}</button>)}</div></header>
      <p className="cr-soon">🔒 Play calling comes with the game engine. This is where you'll pick each play.</p>
      <div className="cr-play-grid">{PLAYS[side].map(([icon, name]) => <button key={name} className="cr-play" disabled><span>{icon}</span>{name}</button>)}</div>
    </section>
  );
}
