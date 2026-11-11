import React, { useState } from 'react';
import { requestNumber } from '../data/coaches.js';

// On your own player's card: ask the commissioner for a new jersey number. He approves or denies it from his inbox.
export default function NumberRequest({ player }) {
  const [open, setOpen] = useState(false);
  const [num, setNum] = useState('');
  const [msg, setMsg] = useState('');
  const send = async () => {
    setMsg('');
    try { await requestNumber(player.id, Number(num)); setMsg(`Sent: asking for #${num}. The commissioner will approve or deny it.`); setOpen(false); } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="numreq">
      {!open && <button type="button" className="btn small ghost" onClick={() => setOpen(true)}>🔢 Ask for a new number</button>}
      {open && (
        <span className="numreq-form">
          New number <input type="number" min="0" max="99" value={num} onChange={(e) => setNum(e.target.value)} />
          <button type="button" className="btn small" disabled={num === ''} onClick={send}>Send request</button>
          <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>Cancel</button>
        </span>
      )}
      {msg && <small className="dim">{msg}</small>}
    </div>
  );
}
