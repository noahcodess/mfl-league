import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import MoodTag from './MoodTag.jsx';
import { useLeagueNumbers, setLeagueNumber } from '../data/schedule.js';

const KEYS = [['trade_request_angry_pct', 'angry', 90], ['trade_request_unhappy_pct', 'unhappy', 15]];

// Commissioner's Desk → League rules → Morale: how moods work, and the chance an angry or unhappy player asks for a trade.
export default function MoraleRules({ canControl }) {
  const [version, setVersion] = useState(0);
  const nums = useLeagueNumbers(KEYS.map(([k]) => k), version);
  const [draft, setDraft] = useState({});
  return (
    <section className="card">
      <h3>😤 Morale &amp; trade requests</h3>
      <ul className="rules-list">
        <li>Every player's mood moves <b>one step</b> toward what his situation earns, every week and at Free agency and Training camp.</li>
        <li>What matters: winning (vets 26+ care most, young guys trust the process), starting vs sitting, his favorite team, a Craft Bowl culture, a new deal. Patient and loyal players shrug off more.</li>
        <li>When a player turns angry or unhappy while trading is open, he rolls once to ask for a trade. Requested players are locked on the trade block. Not traded by the deadline: <b>cut</b>.</li>
      </ul>
      {KEYS.map(([k, mood, def]) => {
        const cur = nums?.[k] ?? def;
        const val = draft[k] ?? cur;
        return (
          <div className="rules-row" key={k}>
            <label><MoodTag mood={mood} size={22} /> asks for a trade <input type="number" min="0" max="100" value={val} disabled={!canControl}
              onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))} />% of the time</label>
            <ConfirmButton className="btn small" label="Save" disabled={!canControl || Number(val) === cur} title={`Set ${mood} players to ${val}%?`} yes="Save"
              text="Counts from the next morale check." onConfirm={async () => { await setLeagueNumber(k, Number(val)); setDraft((d) => ({ ...d, [k]: undefined })); setVersion((v) => v + 1); }} />
          </div>
        );
      })}
    </section>
  );
}
