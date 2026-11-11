import React from 'react';
import { money } from '../lib/format.js';

// The contract offer controls shared by re-signing and free agency: years, money per year, role, total, cap room left after the deal, send.
const STEP = 5000;
export const snapMoney = (n) => Math.max(10000, Math.round(n / STEP) * STEP);

export default function OfferForm({ maxPerYear = Infinity, quote, years, setYears, perYear, setPerYear, role, setRole, canSend, busy, onSend, sendLabel = 'Send offer', busyLabel = 'Sending...' }) {
  const max = Math.min(maxPerYear, Math.floor(1000000 / years / STEP) * STEP); // cap room and the $1M total limit
  const set = (n) => setPerYear(Math.min(max, snapMoney(n)));
  const left = quote.cap_room != null ? quote.cap_room - perYear : null;
  return (
    <div className="nego-form">
      <div className="seg">{[1, 2, 3].map((y) => (
        <button key={y} className={years === y ? 'on' : ''} disabled={y > quote.max_years} onClick={() => setYears(y)}>{y} yr</button>
      ))}</div>
      <div className="money-step">
        <button onClick={() => set(perYear - STEP)} aria-label="Less">−</button>
        <input value={money(perYear)} readOnly aria-label="Per year" />
        <button onClick={() => set(perYear + STEP)} disabled={perYear + STEP > max} aria-label="More">+</button>
        <button className="chip-btn" onClick={() => set(quote.ask)}>His ask</button>
        <button className="chip-btn" onClick={() => set(quote.market)}>Market</button>
      </div>
      <div className="seg">{['starter', 'backup'].map((r) => (
        <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r === 'starter' ? 'Starter' : 'Backup'}</button>
      ))}</div>
      <div className="nego-total">Total {money(perYear * years)}{perYear * years > 1000000 && <span className="warn"> · over the $1M max</span>}
        {perYear > maxPerYear && <span className="warn"> · over your cap room</span>}</div>
      {left != null && (
        <div className={`cap-left${left < 0 ? ' over' : left < 150000 ? ' tight' : ''}`}>
          <span>💰 Cap room left after this deal</span><b key={left}>{left < 0 ? `-${money(-left)}` : money(left)}</b>
          <small>Estimated for the coming season, if he signs at this price.</small>
        </div>
      )}
      <button className="btn wide" disabled={!canSend || perYear > max} onClick={onSend}>{busy ? busyLabel : sendLabel}</button>
    </div>
  );
}
