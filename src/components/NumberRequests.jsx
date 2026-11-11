import React, { useState } from 'react';
import Headshot from './Headshot.jsx';
import { requestNumber, usePendingNumbers } from '../data/coaches.js';

// My Team → Uniforms → Numbers: change any player's number right here, then confirm. Changes go to the commissioner
// as requests ("Request sent to commissioner") and only take effect once he approves. The answer lands in your inbox.
export default function NumberRequests({ team, players }) {
  const [version, setVersion] = useState(0);
  const pending = usePendingNumbers(team.id, version);
  const [edits, setEdits] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const changed = Object.entries(edits).filter(([id, n]) => n !== '' && Number(n) !== players.find((p) => p.id === id)?.number);
  const final = players.map((p) => (edits[p.id] !== undefined && edits[p.id] !== '' ? Number(edits[p.id]) : p.number));
  const dupes = new Set(final.filter((n, i) => n != null && final.indexOf(n) !== i));
  const bad = changed.some(([, n]) => !/^\d{1,2}$/.test(String(n))) || dupes.size > 0;
  const send = async () => {
    setBusy(true); setMsg(null);
    const fails = [];
    for (const [id, n] of changed) { try { await requestNumber(id, Number(n)); } catch (e) { fails.push(`${players.find((p) => p.id === id)?.name}: ${e.message}`); } }
    setBusy(false); setEdits({}); setVersion((v) => v + 1);
    setMsg(fails.length ? { bad: true, text: fails.join(' ') } : { text: `📨 Request sent to commissioner (${changed.length} number${changed.length === 1 ? '' : 's'}). Once he accepts, the new numbers go on. You'll hear back in your inbox.` });
  };
  return (
    <section className="card numreq">
      <header className="numreq-head"><h3>🔢 Numbers</h3><span className="dim">Edit, then confirm. The commissioner approves every change.</span></header>
      <ul className="numreq-list">
        {players.map((p, i) => (
          <li key={p.id} className={dupes.has(final[i]) ? 'dupe' : edits[p.id] !== undefined && edits[p.id] !== '' && Number(edits[p.id]) !== p.number ? 'changed' : ''}>
            <Headshot player={p} team={team} size={34} />
            <span className="numreq-name"><b>{p.name}</b><small>{p.position}{pending.has(p.id) ? ` · ⏳ #${pending.get(p.id)} waiting on the commissioner` : ''}</small></span>
            <span className="numreq-hash">#</span>
            <input inputMode="numeric" maxLength={2} disabled={pending.has(p.id)} value={edits[p.id] ?? (p.number ?? '')}
              onChange={(e) => setEdits((x) => ({ ...x, [p.id]: e.target.value.replace(/\D/g, '') }))} />
          </li>
        ))}
      </ul>
      {dupes.size > 0 && <p className="form-error">Two players can't wear #{[...dupes].join(', #')}.</p>}
      {msg && <p className={msg.bad ? 'form-error' : 'numreq-sent'}>{msg.text}</p>}
      <div className="numreq-actions">
        {changed.length > 0 && <button className="btn ghost small" onClick={() => setEdits({})}>Undo</button>}
        <button className="btn" disabled={!changed.length || bad || busy} onClick={send}>Confirm {changed.length || ''} change{changed.length === 1 ? '' : 's'}</button>
      </div>
    </section>
  );
}
