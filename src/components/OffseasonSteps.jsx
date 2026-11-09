import React from 'react';

// The offseason calendar. The commissioner moves the league from one step to the next from his screen.
export const OFFSEASON_STEPS = [
  ['Birthday Day', 'Every player gets a year older.'],
  ['Retirements', 'Players past the max age (27) retire. Jerseys can be retired.'],
  ['Re-signings', 'Re-sign your own players before they hit the market.'],
  ['Free agency', 'Unsigned players are up for grabs. Scouts reveal potential.'],
  ['Draft', 'Rookies join the league, live in the draft room.'],
  ['Training camp', 'Set depth charts before Week 1.'],
];

export default function OffseasonSteps({ current = 0 }) {
  return (
    <section className="card">
      <h3>Offseason road map</h3>
      <ol className="steps">
        {OFFSEASON_STEPS.map(([name, help], i) => (
          <li key={name} className={i < current ? 'done' : i === current ? 'now' : ''}>
            <span className="step-dot">{i < current ? '✓' : i + 1}</span>
            <span className="step-text"><b>{name}</b><small>{i === current ? `Up next. ${help}` : help}</small></span>
          </li>
        ))}
      </ol>
    </section>
  );
}
