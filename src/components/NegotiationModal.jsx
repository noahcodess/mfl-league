import React, { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { getQuote, sendOffer } from '../data/negotiations.js';
import { topPriority } from '../lib/playerTraits.js';
import { tierOf } from '../lib/tiers.js';
import { money } from '../lib/format.js';

// Re-signing talks with one player: his ask and personality, your offer (years, money, role), and his answers.
const STEP = 5000;
const snap = (n) => Math.max(10000, Math.round(n / STEP) * STEP);

export default function NegotiationModal({ player, team, traits, negotiation, windowOpen, onClose, onChanged }) {
  const [quote, setQuote] = useState(null);
  const [years, setYears] = useState(1);
  const [perYear, setPerYear] = useState(50000);
  const [role, setRole] = useState(player.depth === 'backup' ? 'backup' : 'starter');
  const [chat, setChat] = useState(negotiation?.history || []);
  const [patience, setPatience] = useState(negotiation?.patience ?? traits?.patience ?? 3);
  const [status, setStatus] = useState(negotiation?.status || 'open');
  const [counter, setCounter] = useState(negotiation?.status === 'open' ? negotiation?.counter : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tier = tierOf(player);

  useEffect(() => {
    getQuote(player.id).then((q) => { setQuote(q); setYears(q.years); setPerYear(snap(q.ask * 0.9)); }).catch((e) => setError(e.message));
  }, [player.id]);

  const offer = async (y = years, amount = perYear, r = role) => {
    setBusy(true); setError('');
    try {
      const res = await sendOffer(player.id, y, amount, r);
      setChat((c) => [...c, { years: y, per_year: amount, role: r, result: res.result, line: res.line }]);
      setPatience(res.patience);
      setCounter(res.counter || null);
      setStatus(res.result === 'accepted' ? 'agreed' : res.result === 'walked' ? 'walked' : 'open');
      onChanged?.();
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const done = status !== 'open';
  const canSend = windowOpen && !done && quote && !busy;
  return (
    <Modal onClose={onClose} className="nego" style={{ '--team': team.color, '--team-accent': team.accent }}>
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <div className="nego-head">
        <Headshot player={player} team={team} size={64} />
        <div>
          <h2>Re-sign {player.name}</h2>
          <div className="nego-sub">{player.position} · Age {player.age} · <StarRating value={player.stars} elite={player.elite} /></div>
          <div className={`tier tier-${tier.key}`} title={tier.note}>{tier.label}</div>
        </div>
      </div>
      {quote && (
        <div className="pcard-grid">
          <div className="hl"><span>He's asking</span><b>{money(quote.ask)}/yr</b></div>
          <div><span>Wants</span><b>{quote.years} yr{quote.years > 1 ? 's' : ''}</b></div>
          <div><span>Market value</span><b>{money(quote.market)}</b></div>
          <div><span>Your cap room</span><b className={quote.cap_room < perYear ? 'warn' : ''}>{money(quote.cap_room)}</b></div>
        </div>
      )}
      {traits && (
        <p className="nego-traits">
          Cares most about <b>{topPriority(traits).toLowerCase()}</b> · {traits.greed >= 1.1 ? 'greedy' : traits.greed <= 0.95 ? 'team-friendly' : 'fair'}
          {traits.loyalty >= 0.7 ? ' · loyal to you' : traits.loyalty <= 0.3 ? ' · not attached' : ''} · patience {'❤'.repeat(Math.max(0, patience))}{'♡'.repeat(Math.max(0, (traits.patience ?? 3) - patience))}
        </p>
      )}
      <div className="nego-chat">
        {!chat.length && <p className="dim">{tier.note} Make your first offer.</p>}
        {chat.map((m, i) => (
          <div key={i} className="nego-round">
            <div className="bubble coach">Offer: {m.years} yr · {money(m.per_year)}/yr · {m.role}</div>
            <div className={`bubble player ${m.result}`}>{m.line}</div>
          </div>
        ))}
      </div>
      {status === 'agreed' && <div className="notice good">Deal agreed. It's in the commissioner's inbox for approval.</div>}
      {status === 'walked' && <div className="notice bad">He walked away from talks. He'll hit free agency when the window closes.</div>}
      {!windowOpen && !done && <div className="notice">You can negotiate once the re-signing window opens (the Re-signing step).</div>}
      {error && <div className="form-error">{error}</div>}
      {counter && !done && (
        <button className="btn wide counter-btn" disabled={!canSend} onClick={() => offer(counter.years, counter.per_year, counter.role)}>
          Accept his number: {counter.years} yr · {money(counter.per_year)}/yr
        </button>
      )}
      {!done && quote && (
        <div className="nego-form">
          <div className="seg">{[1, 2, 3].map((y) => (
            <button key={y} className={years === y ? 'on' : ''} disabled={y > quote.max_years} onClick={() => setYears(y)}>{y} yr</button>
          ))}</div>
          <div className="money-step">
            <button onClick={() => setPerYear(snap(perYear - STEP))}>−</button>
            <input value={money(perYear)} readOnly aria-label="Per year" />
            <button onClick={() => setPerYear(snap(perYear + STEP))}>+</button>
            <button className="chip-btn" onClick={() => setPerYear(snap(quote.ask))}>His ask</button>
            <button className="chip-btn" onClick={() => setPerYear(snap(quote.market))}>Market</button>
          </div>
          <div className="seg">{['starter', 'backup'].map((r) => (
            <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r === 'starter' ? 'Starter' : 'Backup'}</button>
          ))}</div>
          <div className="nego-total">Total {money(perYear * years)}{perYear * years > 1000000 && <span className="warn"> · over the $1M max</span>}</div>
          <button className="btn wide" disabled={!canSend} onClick={() => offer()}>{busy ? 'Waiting for his answer...' : 'Send offer'}</button>
        </div>
      )}
    </Modal>
  );
}
