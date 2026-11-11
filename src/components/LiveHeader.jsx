import React, { useEffect, useState } from 'react';
import { useSchedule, untilText, whenText, SCHEDULE_EVENTS } from '../data/schedule.js';
import { currentSeason } from '../data/teams.js';
import { STAGES } from '../lib/liveStage.js';

const LABEL = Object.fromEntries(SCHEDULE_EVENTS);

// Live tab banner: what's happening now, and a live countdown to the next thing on the commissioner's calendar.
export default function LiveHeader({ stage }) {
  const s = STAGES[stage];
  const rows = useSchedule(currentSeason()) || [];
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const target = rows.find((r) => r.kind === s.next) || rows.filter((r) => Date.parse(r.at) > now).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];
  const left = target ? Date.parse(target.at) - now : null;
  return (
    <div className={`live-head live-${stage}`}>
      <div className="live-title">
        <span className="live-pulse" />
        <small>Live · Season {currentSeason()}</small>
        <h1>{s.icon} {s.title}</h1>
      </div>
      <div className="live-clock">
        <small>{target ? `${LABEL[target.kind] || target.label} in` : 'Up next'}</small>
        <b>{target ? (left > 0 ? untilText(left) : 'Now') : 'Date not set yet'}</b>
        {target && <span className="dim">{whenText(target.at)}</span>}
      </div>
    </div>
  );
}
