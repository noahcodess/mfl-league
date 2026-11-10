import React, { useEffect, useState } from 'react';
import { useSchedule, untilText, whenText } from '../data/schedule.js';
import { currentSeason } from '../data/teams.js';
import { links } from '../lib/router.js';

// Team hub card: the next league events the commissioner put on the calendar, each with a live countdown.
export default function ComingUp({ max = 4 }) {
  const rows = useSchedule(currentSeason());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const next = (rows || []).filter((r) => Date.parse(r.at) > now - 3600e3).slice(0, max);
  if (!next.length) return null;
  return (
    <section className="card coming-up">
      <h3>📅 Coming up</h3>
      <ul>
        {next.map((r, i) => {
          const left = Date.parse(r.at) - now;
          const body = (
            <>
              <span className="cu-name"><b>{r.label}</b><small>{whenText(r.at)}</small></span>
              <span className={`cu-clock${left < 3600e3 ? ' soon' : ''}`}>{left > 0 ? untilText(left) : 'Happening now'}</span>
            </>
          );
          return <li key={r.kind} className={i === 0 ? 'first' : ''}>{r.kind === 'draft' ? <a href={links.draft}>{body}</a> : body}</li>;
        })}
      </ul>
    </section>
  );
}
