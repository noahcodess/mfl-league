import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { useLeagueNumbers, setLeagueNumber } from '../data/schedule.js';
import { currentSeason } from '../data/teams.js';

// Commissioner's Desk → Offseason → League rules: when regression starts, and the aging rules in plain words.
export default function LeagueRules({ canControl }) {
  const [version, setVersion] = useState(0);
  const nums = useLeagueNumbers(['regression_from_season'], version);
  const [draft, setDraft] = useState('');
  const from = nums?.regression_from_season ?? 8;
  const value = draft === '' ? from : Number(draft);
  return (
    <div className="rules">
      <section className="card">
        <h3>📉 Regression</h3>
        <ul className="rules-list">
          <li><b>25:</b> players who are done growing and not great (3.5★ and below, some 4★) can slip half a star.</li>
          <li><b>26:</b> most slip (about 8 in 10), at least half a star. Stars hold on more often.</li>
          <li><b>27:</b> everyone slips. Never more than 2 stars below their best; most end up 1 to 1.5 down.</li>
          <li>Lost stars show in <span className="bad">red</span>. A 26 who drops a full star on a small contract is twice as likely to retire early.</li>
        </ul>
        <div className="rules-row">
          <label>Regression starts at the Season <input type="number" min="1" max="99" value={value} disabled={!canControl} onChange={(e) => setDraft(e.target.value)} /> birthday</label>
          <ConfirmButton className="btn small" label="Save" disabled={!canControl || value === from} title={`Start regression at the Season ${value} birthday?`} yes="Save"
            text={value > currentSeason() ? `No one regresses until Season ${value}. Good for easing the league in.` : 'Players regress at the next Birthday & Farewell.'}
            onConfirm={async () => { await setLeagueNumber('regression_from_season', value); setDraft(''); setVersion((v) => v + 1); }} />
        </div>
        <p className="dim">Heads up: the league has a big group of 26 year olds right now, so the first regression birthday hits hard (most current 5★ players slip). Starting a season later spreads it out.</p>
      </section>
    </div>
  );
}
