import React from 'react';

// The offseason calendar. The commissioner moves the league from one step to the next from his screen.
// The step just run is what's happening now (e.g. the re-signing window); the next one is up next.
export const OFFSEASON_STEPS = [
  ['Birthday Day', 'Every player gets a year older.'],
  ['Retirements', 'Players past the max age (27) retire. Jerseys can be retired.'],
  ['Re-signing', 'Expiring contracts end. Teams re-sign their own players before the market opens.'],
  ['Free agency', 'Anyone not re-signed is up for grabs. Scouts reveal potential.'],
  ['Draft', 'Rookies join the league, live in the draft room.'],
  ['Training camp', 'Set depth charts before Week 1.'],
];

export default function OffseasonSteps({ current = 0, title = 'Offseason road map' }) {
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
