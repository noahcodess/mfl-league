import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { useLeagueNumbers, setLeagueNumber } from '../data/schedule.js';

// Commissioner's Desk → League rules → Drip: how player drip requests work, and how long a player waits between changes.
export default function DripRules({ canControl }) {
  const [version, setVersion] = useState(0);
  const nums = useLeagueNumbers(['drip_cooldown'], version);
  const [draft, setDraft] = useState('');
  const cur = nums?.drip_cooldown ?? 2;
  const val = draft === '' ? cur : Number(draft);
  return (
    <section className="card">
      <h3>🧢 Drip &amp; numbers</h3>
      <ul className="rules-list">
        <li>Coaches change a player's helmet, gear or number from his Drip tab. Each request is <b>one change</b>, and you accept or decline it in your inbox with a before and after.</li>
        <li>After you accept, that player waits before his next change. The wait counts game weeks in the season and steps in the offseason.</li>
        <li>You can change anyone's drip directly from his Drip tab, any time.</li>
      </ul>
      <div className="rules-row">
        <label>Wait between changes <input type="number" min="0" max="12" value={val} disabled={!canControl} onChange={(e) => setDraft(e.target.value)} /> weeks / offseason steps</label>
        <ConfirmButton className="btn small" label="Save" disabled={!canControl || val === cur} title={`Make players wait ${val} between drip changes?`} yes="Save"
          onConfirm={async () => { await setLeagueNumber('drip_cooldown', val); setDraft(''); setVersion((v) => v + 1); }} />
      </div>
    </section>
  );
}
