import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { useLeagueNumbers, setLeagueNumber } from '../data/schedule.js';
import { links } from '../lib/router.js';

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
  if (!nums) return <p className="dim">Loading settings...</p>;
  const changed = Object.entries(edits).filter(([k, v]) => v !== '' && Number(v) !== nums[k]);
  const save = async () => {
    for (const [k, v] of changed) await setLeagueNumber(k, Number(v)); // eslint-disable-line no-await-in-loop
    setEdits({}); setVersion((x) => x + 1);
  };
  return (
    <div className="dsettings">
      <div className="dsettings-top">
        <a className="btn" href={links.draft}>🏈 Open the draft room (your desk)</a>
        <a className="btn ghost" href={links.draftStage} target="_blank" rel="noreferrer">📺 Open the stage window</a>
      </div>
      <p className="dim">Start the draft from the Commissioner desk in the draft room. You can start any time once free agency is done; the draft night time is set in the Schedule tab.</p>
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
