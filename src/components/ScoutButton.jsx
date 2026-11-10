import React, { useState } from 'react';
import { scoutPlayer } from '../data/scouting.js';

// "Send a scout" for a draft prospect or free agent. Reveals his potential and bar outlines to your team only.
export default function ScoutButton({ player, left, scouted, known, onScouted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (known && !scouted) return null; // already visible to this person (own team, commissioner, owner)
  if (scouted) return <div className="scout-done">🔭 Scouted. His potential and outlines are yours to see.</div>;
  const go = async () => {
    setBusy(true); setError('');
    try { const r = await scoutPlayer(player.id); onScouted?.(r); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  return (
    <div className="scout-box">
      <button className="btn" disabled={busy || !left} onClick={go}>{busy ? 'Scout on the way...' : `🔭 Send a scout (${left ?? 0} left)`}</button>
      <small className="dim">{player.status === 'prospect' ? 'Draft scouts: 2 per 1st-round pick, 1 per 2nd or 3rd.' : 'Free agency scouts: 5 each offseason.'} Only your team sees what he finds.</small>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
