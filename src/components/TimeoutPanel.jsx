import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { getTeam } from '../data/teams.js';

// Coaching room: your timeouts and the button. Calling one stops the game clock for everyone (the commissioner's screen too).
// A banner shows for a few seconds after any timeout, in both coaching rooms.
export default function TimeoutPanel({ st, side, onTimeout }) {
  const [err, setErr] = useState('');
  const left = st?.[`${side}_timeouts`] ?? 3, live = st?.status === 'live';
  const recent = st?.last_timeout && st.last_timeout_at && Date.now() - Date.parse(st.last_timeout_at) < 8000;
  const why = !live ? 'The game has not started.' : left <= 0 ? 'No timeouts left this half.' : '';
  return (
    <section className="cr-card cr-timeout">
      <header><b>⏱ Timeouts</b><span className="cr-pips">{[0, 1, 2].map((i) => <i key={i} className={i < left ? 'on' : ''} />)}</span></header>
      <ConfirmButton className="btn cr-to-btn" label={`Call timeout (${left} left)`} title="Call a timeout?" yes="Call it" disabled={!!why}
        text="The clock stops right away and you'll have one fewer this half."
        onConfirm={async () => { setErr(''); try { await onTimeout(); } catch (e) { setErr(e.message); } }} />
      {why && <p className="dim">{why}</p>}
      {recent && <p className="cr-to-flash">⏸ Timeout, {getTeam(st.last_timeout)?.name}. Clock stopped.</p>}
      {err && <p className="form-error">{err}</p>}
    </section>
  );
}
