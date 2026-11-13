import React, { useState } from 'react';
import Modal from './Modal.jsx';
import { getTeam } from '../data/teams.js';

const PREF = 'mfl-timeout-ask';
const readAsk = () => { try { return localStorage.getItem(PREF) !== 'no'; } catch { return true; } };
const saveAsk = (on) => { try { localStorage.setItem(PREF, on ? 'yes' : 'no'); } catch { /* private mode: ask again next time */ } };

// Coaching room: the timeout button, a minimal stopwatch. Hover shows a T; tapping it shakes and flashes TIMEOUT for about
// 2 seconds. It asks "are you sure?" first, unless the coach ticked "don't ask me again" (saved in this browser, and can be
// switched back on). A timeout stops the game clock for everyone.
export default function ClockTimeout({ st, side, onTimeout }) {
  const [ask, setAsk] = useState(readAsk), [confirm, setConfirm] = useState(false), [dontAsk, setDontAsk] = useState(false);
  const [called, setCalled] = useState(0), [err, setErr] = useState('');
  const left = st?.[`${side}_timeouts`] ?? 3, live = st?.status === 'live';
  const recent = st?.last_timeout && st.last_timeout_at && Date.now() - Date.parse(st.last_timeout_at) < 8000;
  const why = !live ? 'Available once the game starts.' : left <= 0 ? 'No timeouts left this half.' : '';
  const fire = async () => {
    setErr('');
    try { await onTimeout(); setCalled((n) => n + 1); setTimeout(() => setCalled(0), 2000); } catch (e) { setErr(e.message); }
  };
  const tap = () => { if (why) return; if (ask) { setDontAsk(false); setConfirm(true); } else fire(); };
  const yes = () => { if (dontAsk) { saveAsk(false); setAsk(false); } setConfirm(false); fire(); };
  return (
    <section className="cr-card cr-timeout">
      <header><b>⏱ Timeouts</b><span className="cr-pips">{[0, 1, 2].map((i) => <i key={i} className={i < left ? 'on' : ''} />)}</span></header>
      <button key={called} className={`sw${called ? ' called' : ''}${st?.clock_running ? ' run' : ''}`} disabled={!!why} onClick={tap} aria-label="Call timeout">
        <span className="sw-crown" /><span className="sw-face"><i className="sw-hand" /><b className="sw-t">T</b><b className="sw-word">Timeout</b></span>
      </button>
      <p className="ct-left">{left} left this half</p>
      {why && <p className="dim">{why}</p>}
      {!ask && <button className="link-btn" onClick={() => { saveAsk(true); setAsk(true); }}>Ask before timeouts again</button>}
      {recent && <p className="cr-to-flash">⏸ Timeout, {getTeam(st.last_timeout)?.name}. Clock stopped.</p>}
      {err && <p className="form-error">{err}</p>}
      {confirm && (
        <Modal onClose={() => setConfirm(false)} className="confirm-modal">
          <h2>⏱ Call a timeout?</h2>
          <p>Are you sure you'd like to call a timeout? The clock stops right away for everyone.</p>
          <label className="sw-dont"><input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} /> Don't ask me again</label>
          <div className="confirm-actions"><button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button><button className="btn" onClick={yes}>Yes, timeout</button></div>
        </Modal>
      )}
    </section>
  );
}
