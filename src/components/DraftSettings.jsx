import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { useLeagueNumbers, setLeagueNumber } from '../data/schedule.js';
import { links } from '../lib/router.js';
import { startDraft, restartDraftTest } from '../data/draftActions.js';
import { useDraftStatus } from '../data/draftRoom.js';
import { openDeskWindow } from '../data/draftIntel.js';
import { inSandbox } from '../data/sandbox.js';
import { currentSeason } from '../data/teams.js';

// Every number the commissioner can tune for the draft and rooms, grouped so it's easy to find.
const GROUPS = [
  ['Pick clock (seconds)', [['draft_pick_seconds_top5', 'Picks 1–5'], ['draft_pick_seconds_r1', 'Rest of round 1'], ['draft_pick_seconds', 'Round 2'], ['draft_pick_seconds_r3', 'Round 3']]],
  ['Bot teams (seconds)', [['draft_bot_min_seconds', 'Fastest pick'], ['draft_bot_max_seconds', 'Slowest pick']]],
  ['Announcing (seconds)', [['draft_countdown_seconds', '"Revealed in" countdown'], ['draft_auto_approve_seconds', 'Accept a coach pick on its own after'], ['draft_auto_announce_seconds', 'Announce on its own after']]],
  ['Rooms open early (minutes)', [['draft_room_opens_minutes', 'Draft room'], ['game_room_opens_minutes', 'Game rooms']]],
];
const KEYS = GROUPS.flatMap(([, items]) => items.map(([k]) => k));

export default function DraftSettings({ canControl }) {
  const [version, setVersion] = useState(0);
  const [edits, setEdits] = useState({});
  const nums = useLeagueNumbers(KEYS, version);
  const room = useDraftStatus(currentSeason(), version);
  if (!nums) return <p className="dim">Loading settings...</p>;
  const changed = Object.entries(edits).filter(([k, v]) => v !== '' && Number(v) !== nums[k]);
  const save = async () => {
    for (const [k, v] of changed) await setLeagueNumber(k, Number(v)); // eslint-disable-line no-await-in-loop
    setEdits({}); setVersion((x) => x + 1);
  };
  return (
    <div className="dsettings">
      <div className="dsettings-top">
        {room === null && (
          <ConfirmButton className="btn start-draft" label="▶ START DRAFT" disabled={!canControl} title={`Start the Season ${currentSeason()} draft now?`} yes="Start the draft"
            text={inSandbox() ? '🧪 TEST mode: this works at any step and resets when you leave TEST.' : 'Free agency has to be finished. The first team goes on the clock in 10 seconds and every coach sees it live.'}
            onConfirm={async () => { await startDraft(); window.location.hash = links.draft; }} />
        )}
        {room && room.status !== 'done' && <span className="dstatus live">🔴 Draft in progress · pick #{room.pickNo}</span>}
        {room?.status === 'done' && <span className="dstatus done">✅ The Season {currentSeason()} draft is complete</span>}
        {room && inSandbox() && (
          <ConfirmButton className="btn ghost" label="🔄 Restart the draft (TEST)" disabled={!canControl} title="Take the whole draft back and start over?" yes="Restart it"
            text="Every rookie goes back on the board and undrafted players come back from free agency. Only works in TEST mode." onConfirm={async () => { await restartDraftTest(); setVersion((x) => x + 1); }} />
        )}
        <a className="btn" href={links.draft}>🏈 Draft room</a>
        <button className="btn ghost" onClick={openDeskWindow}>🎛️ Commissioner Window: Draft Desk</button>
      </div>
      <p className="dim">Start the draft here or from the desk. Real league: any time once free agency is done. TEST mode: any time. The draft night time is set in the Schedule tab. On draft night, screen share the Draft room (or Commissioner Window: Draft Stage) and drag Commissioner Window: Draft Desk to your second monitor: it has the picks before they're revealed, every potential, and who scouted and flagged whom.</p>
      {GROUPS.map(([title, items]) => (
        <fieldset key={title} className="dset-group">
          <legend>{title}</legend>
          {items.map(([k, label]) => (
            <label key={k}><span>{label}</span>
              <input type="number" disabled={!canControl} value={edits[k] ?? nums[k] ?? ''} onChange={(e) => setEdits((x) => ({ ...x, [k]: e.target.value }))} />
            </label>
          ))}
        </fieldset>
      ))}
      <ConfirmButton label={`Save ${changed.length || ''} change${changed.length === 1 ? '' : 's'}`} disabled={!canControl || !changed.length} title="Save these draft settings?"
        yes="Save" text="They apply from the next pick on." onConfirm={save} />
    </div>
  );
}
