import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { SCHEDULE_EVENTS, AUTO_KINDS, useSchedule, setScheduleItem, setScheduleAuto, whenText } from '../data/schedule.js';
import { currentSeason } from '../data/teams.js';

// Local "YYYY-MM-DDTHH:MM" for a date input, from an ISO time.
const toInput = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

// Commissioner: put a real date and time on any offseason event. Saving tells every coach and starts a countdown on their hub.
export default function ScheduleEditor({ canControl }) {
  const [season, setSeason] = useState(currentSeason());
  const [version, setVersion] = useState(0);
  const [draft, setDraft] = useState({});
  const [autoError, setAutoError] = useState('');
  const rows = useSchedule(season, version);
  if (!rows) return <p className="dim">Loading the calendar...</p>;
  const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="sched">
      <div className="seg sched-seasons">
        {[currentSeason(), currentSeason() + 1].map((x) => <button key={x} className={season === x ? 'on' : ''} onClick={() => { setSeason(x); setDraft({}); }}>Season {x}</button>)}
      </div>
      <p className="dim">Season {season}: offseason events lead into that season, then kickoff and the Craft Bowl. Dates must go in order, and next season's dates can't come before this season's games are over. Times are in your time zone ({zone}); every coach sees them in theirs. Saving a date notifies everyone and starts a countdown on their team hub.</p>
      {autoError && <p className="form-error">{autoError}</p>}
      <p className="dim">✅ Checked dates run by themselves at 0, as long as the step before them is done. The draft and games always wait for you to press play.</p>
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
                onConfirm={async () => { await setScheduleItem(season, kind, label, new Date(value).toISOString()); setDraft((d) => ({ ...d, [kind]: undefined })); setVersion((v) => v + 1); }} />
              <ConfirmButton className="btn small ghost" label="Clear" disabled={!canControl || !set} title={`Remove the date for ${label}?`} yes="Remove it"
                text="Coaches are told it no longer has a date." onConfirm={async () => { await setScheduleItem(season, kind, label, null); setVersion((v) => v + 1); }} />
              {AUTO_KINDS.includes(kind) ? (
                <label className={`sched-auto${set?.auto ? ' on' : ''}`} title={set ? '' : 'Set a date first'}>
                  <input type="checkbox" checked={!!set?.auto} disabled={!canControl || !set}
                    onChange={async (e) => { setAutoError(''); try { await setScheduleAuto(season, kind, e.target.checked); setVersion((v) => v + 1); } catch (err) { setAutoError(err.message); } }} />
                  Run automatically when the countdown hits 0
                  {set?.ranAt && <em>✅ ran</em>}{set?.autoError && <em className="bad">⚠️ {set.autoError}</em>}
                </label>
              ) : <span className="sched-auto manual">{kind === 'draft' || kind === 'craft_bowl' || kind === 'season_start' ? '▶ You press play for this one' : 'Date only'}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
