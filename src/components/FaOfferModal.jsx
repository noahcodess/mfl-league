import React, { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import OfferForm, { snapMoney } from './OfferForm.jsx';
import BiddingBoard from './BiddingBoard.jsx';
import PlayerSkills from './PlayerSkills.jsx';
import ScoutButton from './ScoutButton.jsx';
import Tabs from './Tabs.jsx';
import InterestMeter, { SIGN_LINE } from './InterestMeter.jsx';
import { getFaQuote, getFaBoard, makeFaOffer, withdrawFaOffer, faOpen, faRound, faRounds } from '../data/freeAgency.js';
import { tierOf } from '../lib/tiers.js';
import { money, plural, heightLabel } from '../lib/format.js';
import { getTeam } from '../data/teams.js';
import { PERSONALITIES, LEFT_HOW } from '../lib/personalities.js';

// Make (or change, or pull) an offer to one free agent. He answers when the commissioner runs the next round.
export const FA_JERSEY = { color: '#3a3f47', accent: '#9aa4b2' };

export default function FaOfferModal({ player, myTeam, canOffer, potential, scouts, scouted, onClose, onChanged }) {
  const [quote, setQuote] = useState(null);
  const [years, setYears] = useState(1);
  const [perYear, setPerYear] = useState(50000);
  const [role, setRole] = useState('backup');
  const [board, setBoard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tier = tierOf(player);
  const old = player.previousTeamId ? getTeam(player.previousTeamId) : null;

  useEffect(() => {
    getFaQuote(player.id).then((q) => {
      setQuote(q);
      if (q.mine) { setYears(q.mine.years); setPerYear(q.mine.per_year); setRole(q.mine.role); }
      else { setYears(q.years); setPerYear(snapMoney(q.ask)); setRole(player.stars >= 3 ? 'starter' : 'backup'); }
    }).catch((e) => setError(e.message));
    getFaBoard(player.id).then(setBoard).catch(() => setBoard([]));
  }, [player.id]);
  const refreshBoard = () => getFaBoard(player.id).then(setBoard).catch(() => {});
  const need = quote?.need?.[role]?.[years - 1];
  const live = need ? Math.min(100, Math.round((SIGN_LINE * perYear) / need)) : null;

  const send = async () => {
    setBusy(true); setError('');
    try { await makeFaOffer(player.id, years, perYear, role); setQuote((q) => ({ ...q, mine: { years, per_year: perYear, role } })); refreshBoard(); onChanged?.(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  const pull = async () => {
    setBusy(true); setError('');
    try { await withdrawFaOffer(player.id); setQuote((q) => ({ ...q, mine: null })); refreshBoard(); onChanged?.(); } catch (e) { setError(e.message); }
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
          <div className="nego-sub">{player.position} · Age {player.age} · {heightLabel(player.height)}{player.weight ? `, ${player.weight} lbs` : ''} · <StarRating value={player.stars} elite={player.elite} />
            {potential != null && <> · POT <StarRating value={potential} elite={potential === 5} /></>}</div>
          <div className={`tier tier-${tier.key}`} title={tier.note}>{tier.label}{player.nationality && player.nationality !== 'USA' ? ` · ${player.nationality}` : ''}</div>
        </div>
      </div>
      <Tabs tabs={[
        { key: 'offer', label: 'Offer', render: () => (
          <>
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
      {quote?.type && (
        <div className="fa-type"><b>{PERSONALITIES[quote.type]?.label}</b> <span className="dim">{PERSONALITIES[quote.type]?.note}
          {quote.type === 'hometown' && quote.favorite_team && ` Grew up a ${getTeam(quote.favorite_team)?.name || quote.favorite_team} fan.`}</span></div>
      )}
      {quote?.grudge === 0 && <div className="notice grudge">“{quote.grudge_line}” <span className="dim">He won't sign with you this offseason.</span></div>}
      {quote?.grudge > 0 && quote.left_how && <div className="notice">{LEFT_HOW[quote.left_how]}</div>}
      <BiddingBoard board={board} />
      {!open && <div className="notice">Offers open during the Free agency step. {faRound() >= faRounds() ? 'This year\'s rounds are done.' : ''}</div>}
      {open && !canOffer && <div className="notice">Only a team's coach can make offers.</div>}
      {error && <div className="form-error">{error}</div>}
      {open && canOffer && quote && quote.grudge !== 0 && (
        <>
          {live != null && (
            <div className="my-meter"><span>His interest in this offer</span><InterestMeter value={live} mine /><b>{live >= SIGN_LINE ? 'He\'d sign' : `${live}%`}</b></div>
          )}
          <OfferForm maxPerYear={quote.cap_room ?? Infinity} quote={quote} years={years} setYears={setYears} perYear={perYear} setPerYear={setPerYear} role={role} setRole={setRole}
            canSend={!busy} busy={busy} onSend={send} sendLabel={quote.mine ? 'Update offer' : 'Make offer'} />
          {quote.mine && <button className="btn wide ghost" disabled={busy} onClick={pull}>Pull my offer</button>}
          <p className="dim help">You have {quote.offers_out} of {quote.offers_max ?? '?'} offers out this round. Round {Math.min(faRound() + 1, faRounds())} of {faRounds()} is next.</p>
        </>
      )}
          </>
        ) },
        { key: 'player', label: 'Player', render: () => (
          <>
            {scouts && <ScoutButton player={player} left={scouts.fa} scouted={scouted} known={potential != null} onScouted={() => onChanged?.()} />}
            <PlayerSkills player={player} potential={potential} />
          </>
        ) },
      ]} />
    </Modal>
  );
}
