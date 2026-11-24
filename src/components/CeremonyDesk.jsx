// The Awards tab's ceremony box: set the show's date, and confirm every award's 3 finalists (two short warnings first,
// since it can't be undone; it has to happen before the league goes past Week 12). Start show comes with the show itself.
import React, { useState } from 'react';
import Modal from './Modal.jsx';
import { AWARDS } from '../lib/awardRank.js';
import { lockFinalists, setShowDate, showStep } from '../data/ceremony.js';
import { inSandbox } from '../data/sandbox.js';

const local = (iso) => { if (!iso) return ''; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };

// state: from useCeremony. lists: award key -> list. due: Week 12 is done, so confirming is what's holding up the league.
export default function CeremonyDesk({ season, state, lists, canControl, due, reload }) {
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const short = AWARDS.filter((a) => { const n = (lists[a.key] || []).length; return n > 0 && n < 3; });   // empty = not given this season
  const act = async (fn) => { setBusy(true); setErr(''); try { await fn(); await reload(); setStep(0); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  if (!state) return null;
  return (
    <section className="aw-cer">
      <h3>🎭 Season {season} Award Ceremony</h3>
      <div className="aw-cer-row">
        <label>Show date <input type="datetime-local" defaultValue={local(state.show_at)} disabled={!canControl || state.started}
          onChange={(e) => e.target.value && setShowDate(season, new Date(e.target.value).toISOString()).then(reload).catch((x) => setErr(x.message))} /></label>
        <span className="dim">{state.show_at ? 'The Live tab counts down to it.' : 'No date yet: the Live tab says "date coming soon".'}</span>
      </div>
      {state.locked
        ? <p className="aw-cer-ok">✅ Finalists confirmed and showing on the Live tab. {state.started ? (state.finished ? 'The show is over.' : 'The show is on now.') : 'You can still change the order of each award\'s 3 (#1 wins) until the show starts.'}</p>
        : <>
            <p className="aw-cer-warn">{due ? '⚠️ Week 12 is done. Confirm the finalists before going to the next week.' : 'After Week 12, confirm the finalists here. The league can\'t go past Week 12 until you do.'}</p>
            <div className="aw-cer-row">
              <button className="btn" disabled={!canControl || busy || short.length > 0} onClick={() => setStep(1)}>🔒 Confirm finalists</button>
              {short.length > 0 && <span className="dim">Needs 3 finalists: {short.map((a) => a.name).join(', ')}</span>}
            </div>
          </>}
      {inSandbox() && canControl && state.locked && <button className="btn small ghost" disabled={busy} onClick={() => act(() => showStep(season, 'reset'))}>🧪 Reset the ceremony (TEST only)</button>}
      {err && <p className="form-error">{err}</p>}
      {step > 0 && (
        <Modal onClose={() => !busy && setStep(0)} className="confirm-modal">
          {step === 1 ? <>
            <h2>⚠️ Confirm the finalists?</h2>
            <p>These 3 for every award become permanent. You can still change the order of the 3 (that picks the winner) until the show starts.</p>
            <div className="aw-cer-sum">{AWARDS.map((a) => <div key={a.key}><b>{a.icon} {a.name}</b><span>{(lists[a.key] || []).length ? lists[a.key].slice(0, 3).map((r) => r.name).join(' · ') : 'Not given this season'}</span></div>)}</div>
            <div className="confirm-actions"><button className="btn ghost" onClick={() => setStep(0)}>Not yet</button><button className="btn" onClick={() => setStep(2)}>Looks right</button></div>
          </> : <>
            <h2>🔒 Last check</h2>
            <p>Everyone will see the finalists on the Live tab right away (in a random order, so nobody can tell who won). This can't be undone.</p>
            {err && <p className="notice bad">{err}</p>}
            <div className="confirm-actions"><button className="btn ghost" disabled={busy} onClick={() => setStep(1)}>Back</button>
              <button className="btn" disabled={busy} onClick={() => act(() => lockFinalists(season))}>{busy ? 'Working...' : 'Confirm finalists'}</button></div>
          </>}
        </Modal>
      )}
    </section>
  );
}
