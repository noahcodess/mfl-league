import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { getTeam } from '../data/teams.js';

// Coaching room: the timeout button, shaped like a clock (its hand sweeps while the game clock runs). Calling one stops the
// game clock for everyone. Shows how many you have left, and a banner for a few seconds after any timeout.
export default function ClockTimeout({ st, side, onTimeout }) {
  const [err, setErr] = useState('');
  const left = st?.[`${side}_timeouts`] ?? 3, live = st?.status === 'live';
  const recent = st?.last_timeout && st.last_timeout_at && Date.now() - Date.parse(st.last_timeout_at) < 8000;
  const why = !live ? 'Available once the game starts.' : left <= 0 ? 'No timeouts left this half.' : '';
  const face = (
    <span className={`ct-face${st?.clock_running ? ' run' : ''}`}>
      <i className="ct-hand h" /><i className="ct-hand m" /><i className="ct-dot" />
      <b>Timeout</b>
    </span>
  );
  return (
    <section className="cr-card cr-timeout">
      <header><b>⏱ Timeouts</b><span className="cr-pips">{[0, 1, 2].map((i) => <i key={i} className={i < left ? 'on' : ''} />)}</span></header>
      <ConfirmButton className="ct-btn" label={face} title="Call a timeout?" yes="Call it" disabled={!!why}
        text="The clock stops right away for everyone and you'll have one fewer this half."
        onConfirm={async () => { setErr(''); try { await onTimeout(); } catch (e) { setErr(e.message); } }} />
      <p className="ct-left">{left} left this half</p>
      {why && <p className="dim">{why}</p>}
      {recent && <p className="cr-to-flash">⏸ Timeout, {getTeam(st.last_timeout)?.name}. Clock stopped.</p>}
      {err && <p className="form-error">{err}</p>}
    </section>
  );
}
