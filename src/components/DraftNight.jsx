import React from 'react';
import { whenText } from '../data/schedule.js';

const split = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60]; };

// Before the draft: the Draft Night countdown. The room opens a set number of minutes early (15 by default);
// once the time hits zero it waits for the commissioner to press Start.
export default function DraftNight({ season, startsAt, opensMinutes = 15, now, prospects, isCoach }) {
  if (!startsAt) {
    return (
      <section className="dnight">
        <div className="dnight-kicker">Season {season} draft</div>
        <div className="dnight-big">Draft night is coming</div>
        <p>The commissioner hasn't set the date yet. {prospects} prospects are on the board: scout them and ⚑ flag the ones you want.</p>
      </section>
    );
  }
  const start = Date.parse(startsAt);
  const doors = start - opensMinutes * 60000;
  const stage = now >= start ? 'waiting' : now >= doors ? 'open' : 'soon';
  const [d, h, m, s] = split(start - now);
  const box = (n, label) => <div className="dn-box"><b key={`${label}-${n}`}>{String(n).padStart(2, '0')}</b><small>{label}</small></div>;
  return (
    <section className={`dnight dnight-${stage}`}>
      <div className="dnight-kicker">{stage === 'soon' ? 'Draft night' : stage === 'open' ? '🚪 The draft room is open' : 'Any second now'}</div>
      <div className="dnight-big">{stage === 'waiting' ? 'Waiting for the commissioner to start the draft' : `Season ${season} Draft`}</div>
      {stage !== 'waiting' && <div className="dn-clock">{d > 0 && box(d, 'days')}{box(h, 'hours')}{box(m, 'min')}{box(s, 'sec')}</div>}
      <p>
        {whenText(startsAt)}
        {stage === 'soon' && ` · The draft room opens ${opensMinutes} minutes before.`}
        {stage === 'open' && ' · Get your board ready and stick around.'}
      </p>
      {isCoach && stage !== 'waiting' && <p className="dim">Scout and ⚑ flag your targets below. Your flags are what Auto pick uses if your time ever runs out.</p>}
    </section>
  );
}
