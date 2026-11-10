import React from 'react';

// The offseason calendar. The commissioner moves the league from one step to the next from his screen.
// The step just run is what's happening now (e.g. the re-signing window); the next one is up next.
export const OFFSEASON_STEPS = [
  ['Birthday & Farewell', 'Every player gets a year older, young players grow toward their potential, and anyone past 27 retires.'],
  ['Re-signing', 'Expiring contracts end. Teams re-sign their own players before the market opens.'],
  ['Free agency', 'Anyone not re-signed is up for grabs. Teams bid, players pick over a few rounds.'],
  ['Draft', 'Rookies join the league, live in the draft room.'],
  ['Training camp', 'Set depth charts before Week 1.'],
];

// compact: a one-line step bar plus what's happening now (for the dashboard).
export default function OffseasonSteps({ current = 0, title = 'Offseason road map', compact = false }) {
  if (compact) {
    const live = OFFSEASON_STEPS[current - 1];
    const next = OFFSEASON_STEPS[current];
    return (
      <section className="card">
        <h3>{title}</h3>
        <div className="stepbar">{OFFSEASON_STEPS.map(([name], i) => (
          <span key={name} className={i < current - 1 ? 'done' : i === current - 1 ? 'live' : i === current ? 'now' : ''} title={OFFSEASON_STEPS[i][1]}>{name}</span>
        ))}</div>
        <div className="step-now">
          {live && <><b>Now: {live[0]}</b><p>{live[1]}</p></>}
          {next && <p style={{ marginTop: live ? 8 : 0 }}><b style={{ display: 'inline' }}>Up next: {next[0]}.</b> {next[1]}</p>}
        </div>
      </section>
    );
  }
  return (
    <section className="card">
      <h3>{title}</h3>
      <ol className="steps">
        {OFFSEASON_STEPS.map(([name, help], i) => (
          <li key={name} className={i < current - 1 ? 'done' : i === current - 1 ? 'live' : i === current ? 'now' : ''}>
            <span className="step-dot">{i < current ? '✓' : i + 1}</span>
            <span className="step-text"><b>{name}</b><small>{i === current ? `Up next. ${help}` : i === current - 1 ? `Now. ${help}` : help}</small></span>
          </li>
        ))}
      </ol>
    </section>
  );
}
