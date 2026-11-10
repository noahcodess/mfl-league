import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { getTeam } from '../data/teams.js';

// "Draft him with pick #12?" One tap to lock it in. The pick goes to the commissioner to accept.
export default function DraftConfirm({ player, slot, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const team = getTeam(slot.team_id);
  const go = async () => {
    setBusy(true); setErr('');
    try { await onConfirm(player); onClose(); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal onClose={() => !busy && onClose()} className="draft-confirm" style={{ '--team': team?.color, '--team-accent': team?.accent }}>
      <div className="dc-glow" />
      <Headshot player={player} team={team} size={120} />
      <div className="dc-pick">Pick #{slot.pick_no} · Round {slot.round}</div>
      <h2>{player.name}</h2>
      <p>{player.position} · {player.college} · <StarRating value={player.stars} /></p>
      {err && <p className="notice bad">{err}</p>}
      <div className="confirm-actions">
        <button className="btn ghost" disabled={busy} onClick={onClose}>Not yet</button>
        <button className="btn lock-in" disabled={busy} onClick={go}>{busy ? 'Sending...' : '🔒 Lock in the pick'}</button>
      </div>
    </Modal>
  );
}
