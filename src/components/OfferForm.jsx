import React from 'react';
import { money } from '../lib/format.js';

// The contract offer controls shared by re-signing and free agency: years, money per year, role, total, send.
const STEP = 5000;
export const snapMoney = (n) => Math.max(10000, Math.round(n / STEP) * STEP);

export default function OfferForm({ quote, years, setYears, perYear, setPerYear, role, setRole, canSend, busy, onSend, sendLabel = 'Send offer', busyLabel = 'Sending...' }) {
  return (
    <div className="nego-form">
      <div className="seg">{[1, 2, 3].map((y) => (
        <button key={y} className={years === y ? 'on' : ''} disabled={y > quote.max_years} onClick={() => setYears(y)}>{y} yr</button>
      ))}</div>
      <div className="money-step">
        <button onClick={() => setPerYear(snapMoney(perYear - STEP))} aria-label="Less">−</button>
        <input value={money(perYear)} readOnly aria-label="Per year" />
        <button onClick={() => setPerYear(snapMoney(perYear + STEP))} aria-label="More">+</button>
        <button className="chip-btn" onClick={() => setPerYear(snapMoney(quote.ask))}>His ask</button>
        <button className="chip-btn" onClick={() => setPerYear(snapMoney(quote.market))}>Market</button>
      </div>
      <div className="seg">{['starter', 'backup'].map((r) => (
        <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r === 'starter' ? 'Starter' : 'Backup'}</button>
      ))}</div>
      <div className="nego-total">Total {money(perYear * years)}{perYear * years > 1000000 && <span className="warn"> · over the $1M max</span>}</div>
      <button className="btn wide" disabled={!canSend} onClick={onSend}>{busy ? busyLabel : sendLabel}</button>
    </div>
  );
}
