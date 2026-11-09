import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';
import { store } from '../data/store.js';
import { reviewDeal } from '../data/negotiations.js';
import { money } from '../lib/format.js';

// League office inbox: deals coaches agreed with players, waiting for the commissioner to approve or deny.
export default function DealInbox({ negotiations, canControl, onDone }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const waiting = negotiations.filter((n) => n.status === 'agreed');
  const nameOf = (id) => store.league.players.find((p) => p.id === id)?.name || id;
  const act = async (n, approve) => {
    const note = approve ? null : window.prompt('Why deny it? (optional, the coach sees this)') ?? null;
    setBusy(n.id); setError('');
    try { await reviewDeal(n.id, approve, note); await onDone(); } catch (e) { setError(e.message); }
    setBusy(null);
  };
  return (
    <section className="card">
      <h3>Deals waiting for approval <span className="count">{waiting.length}</span></h3>
      {error && <div className="form-error">{error}</div>}
      {!waiting.length && <p className="dim">Nothing waiting. Agreed re-signings land here.</p>}
      {waiting.map((n) => {
        const team = getTeam(n.team_id);
        return (
          <div key={n.id} className="deal-row">
            {team && <TeamBadge team={team} size="sm" />}
            <span className="deal-text"><b>{nameOf(n.player_id)}</b><small>{n.offer.years} yr · {money(n.offer.per_year)}/yr · {n.offer.role} · asked {money(n.ask_per_year)}</small></span>
            <button className="btn small" disabled={!canControl || busy === n.id} onClick={() => act(n, true)}>Approve</button>
            <button className="btn small danger" disabled={!canControl || busy === n.id} onClick={() => act(n, false)}>Deny</button>
          </div>
        );
      })}
    </section>
  );
}
