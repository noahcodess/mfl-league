import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { botRunWeek, useBotWeekLast } from '../data/coachBrain.js';
import { shortDate } from '../lib/format.js';

// Commissioner: when the bots last did their weekly moves, and a button to run a bot week right now.
export default function BotWeekPanel({ canControl, onDone }) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const last = useBotWeekLast(version);
  const run = async () => {
    setError('');
    try { setResult(await botRunWeek()); setVersion((v) => v + 1); onDone?.(); } catch (e) { setError(e.message); }
  };
  return (
    <div className="botweek">
      <div>
        <b>🤖 Bot week</b>
        <p className="dim">Once a week, bots refresh their trade blocks, sometimes trade with each other, rarely make an offer for a coach's block player, and (in season) sign free agents to fill holes. Last run: {last ? shortDate(last) : 'never'}.</p>
        {result && <p className="botweek-result">✅ {result.blocks} on the block · {result.deals} bot trade{result.deals === 1 ? '' : 's'} · {result.offers} offer{result.offers === 1 ? '' : 's'} to coaches · {result.filled} signed</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
      <ConfirmButton className="btn small" label="⚡ Run bot week now" disabled={!canControl} title="Run a bot week now?" yes="Run it"
        text="Bots make this week's moves right away. The next automatic run is 7 days after this one." onConfirm={run} />
    </div>
  );
}
