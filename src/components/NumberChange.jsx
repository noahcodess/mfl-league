import React, { useState } from 'react';
import { requestNumber, usePendingNumber } from '../data/coaches.js';
import { updatePlayer } from '../data/commishEdit.js';

// Drip tab → Number: type a new number and request it. Separate from drip and not limited: ask as often as you like.
// The commissioner approves in his inbox (or, if it's him, it saves right away). The preview shows the number as you type.
export default function NumberChange({ player, mine, commish, value, onPreview }) {
  const [version, setVersion] = useState(0);
  const pending = usePendingNumber(player.id, version);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const changed = value !== '' && value != null && Number(value) !== player.number;
  const send = async () => {
    setBusy(true); setMsg('');
    try {
      if (commish) { await updatePlayer(player.id, { number: Number(value) }); setMsg('✅ Number saved.'); }
      else { await requestNumber(player.id, Number(value)); setMsg(`📨 Request sent to commissioner for #${value}. You'll hear back in your inbox.`); }
      setVersion((v) => v + 1);
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };
  if (!mine && !commish) return <div className="num-change"><span>Number</span><b>#{player.number ?? '-'}</b></div>;
  return (
    <div className="num-change">
      <span>Number</span>
      <span className="num-input">#<input inputMode="numeric" maxLength={2} disabled={pending != null && !commish} value={value ?? ''}
        onChange={(e) => { setMsg(''); onPreview(e.target.value.replace(/\D/g, '')); }} /></span>
      <button className="btn small" disabled={!changed || busy || (pending != null && !commish)} onClick={send}>{commish ? 'Save' : 'Request'}</button>
      {pending != null && <small className="num-pending">⏳ #{pending} waiting on the commissioner</small>}
      {msg && <small className={msg.startsWith('✅') || msg.startsWith('📨') ? 'num-ok' : 'form-error'}>{msg}</small>}
    </div>
  );
}
