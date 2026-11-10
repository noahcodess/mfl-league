import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { SCHEDULE_EVENTS, useSchedule, setScheduleItem, whenText } from '../data/schedule.js';
import { currentSeason } from '../data/teams.js';

// Local "YYYY-MM-DDTHH:MM" for a date input, from an ISO time.
const toInput = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

// Commissioner: put a real date and time on any offseason event. Saving tells every coach and starts a countdown on their hub.
export default function ScheduleEditor({ canControl }) {
  const season = currentSeason();
  const [version, setVersion] = useState(0);
  const [draft, setDraft] = useState({});
  const rows = useSchedule(season, version);
  if (!rows) return <p className="dim">Loading the calendar...</p>;
  const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="sched">
      <p className="dim">Season {season}. Times are in your time zone ({zone}); every coach sees them in theirs. Saving a date notifies everyone and starts a countdown on their team hub.</p>
      <ul className="sched-list">
        {SCHEDULE_EVENTS.map(([kind, label]) => {
          const set = byKind[kind];
          const value = draft[kind] ?? (set ? toInput(set.at) : '');
          const changed = value && (!set || value !== toInput(set.at));
          return (
            <li key={kind} className={set ? 'set' : ''}>
              <div className="sched-name"><b>{label}</b><small>{set ? `📅 ${whenText(set.at)}` : 'No date yet'}</small></div>
              <input type="datetime-local" value={value} disabled={!canControl} onChange={(e) => setDraft((d) => ({ ...d, [kind]: e.target.value }))} />
              <ConfirmButton className="btn small" label="Save" disabled={!canControl || !changed} title={`Set ${label} for ${value ? whenText(new Date(value).toISOString()) : ''}?`}
                yes="Set the date" text="Every coach gets a notice on the site and a countdown on their team hub."
                onConfirm={async () => { await setScheduleItem(kind, label, new Date(value).toISOString()); setDraft((d) => ({ ...d, [kind]: undefined })); setVersion((v) => v + 1); }} />
              <ConfirmButton className="btn small ghost" label="Clear" disabled={!canControl || !set} title={`Remove the date for ${label}?`} yes="Remove it"
                text="Coaches are told it no longer has a date." onConfirm={async () => { await setScheduleItem(kind, label, null); setVersion((v) => v + 1); }} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
