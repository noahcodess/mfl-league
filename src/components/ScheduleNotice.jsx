import React, { useState } from 'react';
import { leagueEvents } from '../data/teams.js';

const KEY = 'mfl-seen-schedule';
const seen = () => { try { return Number(window.localStorage.getItem(KEY) || 0); } catch { return 0; } };

// Site-wide notice when the commissioner sets or changes a date ("📅 Draft night: Sat, Nov 14 at 8:00 PM ET"). Shows until dismissed.
export default function ScheduleNotice() {
  const [last, setLast] = useState(seen);
  const fresh = leagueEvents().filter((e) => e.kind === 'schedule' && e.id > last).sort((a, b) => b.id - a.id);
  if (!fresh.length) return null;
  const dismiss = () => {
    try { window.localStorage.setItem(KEY, String(fresh[0].id)); } catch { /* storage blocked */ }
    setLast(fresh[0].id);
  };
  return (
    <div className="sched-notice">
      <span className="sched-bell">🔔</span>
      <span><b>Schedule update:</b> {fresh[0].summary.replace(/^📅\s*/, '')}{fresh.length > 1 && <small> (+{fresh.length - 1} more)</small>}</span>
      <button className="btn small ghost" onClick={dismiss}>Got it</button>
    </div>
  );
}
