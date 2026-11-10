import React, { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import OfferForm, { snapMoney } from './OfferForm.jsx';
import { getFaQuote, makeFaOffer, withdrawFaOffer, faOpen, faRound, faRounds, maxOpenOffers, READS } from '../data/freeAgency.js';
import { tierOf } from '../lib/tiers.js';
import { money, plural } from '../lib/format.js';
import { getTeam } from '../data/teams.js';

// Make (or change, or pull) an offer to one free agent. He answers when the commissioner runs the next round.
export const FA_JERSEY = { color: '#3a3f47', accent: '#9aa4b2' };

export default function FaOfferModal({ player, myTeam, canOffer, potential, onClose, onChanged }) {
  const [quote, setQuote] = useState(null);
  const [years, setYears] = useState(1);
  const [perYear, setPerYear] = useState(50000);
  const [role, setRole] = useState('backup');
  const [read, setRead] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tier = tierOf(player);
  const old = player.previousTeamId ? getTeam(player.previousTeamId) : null;

  useEffect(() => {
    getFaQuote(player.id).then((q) => {
      setQuote(q);
      if (q.mine) { setYears(q.mine.years); setPerYear(q.mine.per_year); setRole(q.mine.role); setRead(q.mine.read); }
      else { setYears(q.years); setPerYear(snapMoney(q.ask)); setRole(player.stars >= 3 ? 'starter' : 'backup'); }
    }).catch((e) => setError(e.message));
  }, [player.id]);

  const send = async () => {
    setBusy(true); setError('');
    try { const r = await makeFaOffer(player.id, years, perYear, role); setRead(r.read); setQuote((q) => ({ ...q, mine: { years, per_year: perYear, role } })); onChanged?.(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  const pull = async () => {
    setBusy(true); setError('');
    try { await withdrawFaOffer(player.id); setRead(null); setQuote((q) => ({ ...q, mine: null })); onChanged?.(); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const open = faOpen();
  const team = myTeam || FA_JERSEY;
  return (
    <Modal onClose={onClose} className="nego" style={{ '--team': team.color, '--team-accent': team.accent }}>
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <div className="nego-head">
        <Headshot player={player} team={FA_JERSEY} size={64} />
        <div>
          <h2>{player.name}</h2>
          <div className="nego-sub">{player.position} · Age {player.age} · <StarRating value={player.stars} elite={player.elite} />
            {potential != null && <> · POT <StarRating value={potential} elite={potential === 5} /></>}</div>
          <div className={`tier tier-${tier.key}`} title={tier.note}>{tier.label}{player.nationality && player.nationality !== 'USA' ? ` · ${player.nationality}` : ''}</div>
        </div>
      </div>
      {quote && (
        <div className="pcard-grid">
          <div className="hl"><span>Asking</span><b>{money(quote.ask)}/yr</b></div>
          <div><span>Wants</span><b>{plural(quote.years, 'yr')}</b></div>
          <div><span>Market value</span><b>{money(quote.market)}</b></div>
          <div><span>Teams interested</span><b>{quote.interest}</b></div>
          {quote.cap_room != null && <div><span>Your cap room</span><b className={quote.cap_room < perYear ? 'warn' : ''}>{money(quote.cap_room)}</b></div>}
          {old && <div><span>Last team</span><b>{old.name}</b></div>}
        </div>
      )}
      <p className="dim fa-how">
        Free agency runs in {faRounds()} rounds. After each round, every player picks the best offer he'll take: money first, but playing time,
        a winning team and loyalty to his old team count too. Nobody signs? He gets less picky next round.
      </p>
      {read && <div className={`notice read-${read}`}><b>{READS[read].label}.</b> {READS[read].note}</div>}
      {!open && <div className="notice">Offers open during the Free agency step. {faRound() >= faRounds() ? 'This year\'s rounds are done.' : ''}</div>}
      {open && !canOffer && <div className="notice">Only a team's coach can make offers.</div>}
      {error && <div className="form-error">{error}</div>}
      {open && canOffer && quote && (
        <>
          <OfferForm quote={quote} years={years} setYears={setYears} perYear={perYear} setPerYear={setPerYear} role={role} setRole={setRole}
            canSend={!busy} busy={busy} onSend={send} sendLabel={quote.mine ? 'Update offer' : 'Make offer'} />
          {quote.mine && <button className="btn wide ghost" disabled={busy} onClick={pull}>Pull my offer</button>}
          <p className="dim help">You have {quote.offers_out} of {maxOpenOffers()} offers out. Round {Math.min(faRound() + 1, faRounds())} of {faRounds()} is next.</p>
        </>
      )}
    </Modal>
  );
}
