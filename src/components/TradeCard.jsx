import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import TradeAsset from './TradeAsset.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { getTeam } from '../data/teams.js';
import { respondTrade, cancelTrade, commishTrade } from '../data/trades.js';
import { shortDate } from '../lib/format.js';
import { botAnswerNow } from '../data/coachBrain.js';

const STATUS = { pending: 'Waiting', accepted: 'Done', declined: 'Declined', cancelled: 'Cancelled', vetoed: 'Vetoed', expired: 'Expired' };

// One trade: who sends what, the note, and the buttons this viewer gets (accept/decline, cancel, or the commissioner's veto/accept).
export default function TradeCard({ trade, myTeamId, commish, coached = [], onChange }) {
  const from = getTeam(trade.from) || { name: trade.from, code: trade.from };
  const to = getTeam(trade.to) || { name: trade.to, code: trade.to };
  const items = (list) => list.map((i) => i.player || i.pick).filter(Boolean);
  const pending = trade.status === 'pending';
  const toBot = !coached.includes(trade.to);
  const interim = toBot && to.reserved;
  const verdict = trade.botVerdict;
  const done = async (fn) => { await fn(); onChange?.(); };
  return (
    <article className={`tcard tcard-${trade.status}`}>
      <header>
        <TeamBadge team={from} size="sm" /><b>{from.code}</b><span className="tcard-arrow">⇄</span><TeamBadge team={to} size="sm" /><b>{to.code}</b>
        <span className={`tcard-status s-${trade.status}`}>{STATUS[trade.status]}</span>
        <small className="dim">{shortDate(trade.createdAt)}</small>
      </header>
      <div className="tcard-sides">
        <div><div className="tside-head"><TeamBadge team={from} size="sm" /><small>{from.name} send</small></div>{items(trade.give).map((x) => <TradeAsset key={x.id} item={x} />)}</div>
        <div><div className="tside-head"><TeamBadge team={to} size="sm" /><small>{to.name} send</small></div>{items(trade.get).map((x) => <TradeAsset key={x.id} item={x} />)}</div>
      </div>
      {trade.note && <p className="tcard-note">💬 {trade.note}</p>}
      {pending && toBot && !interim && <p className="tcard-bot think">🤖 Their coach is thinking it over<i>.</i><i>.</i><i>.</i> Bots answer in a few minutes.{commish ? ' You can still accept or veto first.' : ''}</p>}
      {pending && interim && <p className="dim tcard-bot">🪑 Reserved team with no head coach yet: the commissioner answers this one.</p>}
      {!pending && verdict && trade.decidedBy === 'bot' && (
        <div className={`tcard-verdict ${verdict.accept ? 'yes' : 'no'}`}>
          <b>🤖 {to.code} coach: {verdict.accept ? 'Deal.' : 'No deal.'}</b>
          <ul>{(verdict.reasons || []).map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
      {pending && (
        <div className="tcard-btns">
          {trade.to === myTeamId && (
            <>
              <ConfirmButton className="btn good" label="✅ Accept" title="Accept this trade?" yes="Accept the trade"
                text="It goes through right away if both teams stay under the cap and the 45-man roster limit." onConfirm={() => done(() => respondTrade(trade.id, true))} />
              <ConfirmButton className="btn ghost" label="✋ Decline" title="Decline this trade?" yes="Decline" onConfirm={() => done(() => respondTrade(trade.id, false))} />
            </>
          )}
          {trade.from === myTeamId && <ConfirmButton className="btn ghost" label="Cancel offer" title="Cancel your trade offer?" yes="Cancel it" onConfirm={() => done(() => cancelTrade(trade.id))} />}
          {commish && (
            <>
              {toBot && !interim && <ConfirmButton className="btn small" label="⚡ Bot answers now" title="Have their coach answer right now?" yes="Answer now"
                text="Skips the wait. The bot judges the offer the same way it always would." onConfirm={() => done(() => botAnswerNow(trade.id))} />}
              <ConfirmButton className="btn small" label={`✅ Accept for ${to.code}`} title={`Accept this trade on behalf of the ${to.name}?`} yes="Accept for them"
                text="Settles it yourself, for a reserved team or to overrule a bot." onConfirm={() => done(() => commishTrade(trade.id, true))} />
              <ConfirmButton className="btn small ghost" label="⛔ Veto" title="Veto this trade?" yes="Veto it" text="Both coaches are told the commissioner vetoed it." onConfirm={() => done(() => commishTrade(trade.id, false))} />
            </>
          )}
        </div>
      )}
    </article>
  );
}
