import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import TradeAsset from './TradeAsset.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { getTeam } from '../data/teams.js';
import { respondTrade, cancelTrade, commishTrade } from '../data/trades.js';
import { shortDate } from '../lib/format.js';

const STATUS = { pending: 'Waiting', accepted: 'Done', declined: 'Declined', cancelled: 'Cancelled', vetoed: 'Vetoed', expired: 'Expired' };

// One trade: who sends what, the note, and the buttons this viewer gets (accept/decline, cancel, or the commissioner's veto/accept).
export default function TradeCard({ trade, myTeamId, commish, coached = [], onChange }) {
  const from = getTeam(trade.from) || { name: trade.from, code: trade.from };
  const to = getTeam(trade.to) || { name: trade.to, code: trade.to };
  const items = (list) => list.map((i) => i.player || i.pick).filter(Boolean);
  const pending = trade.status === 'pending';
  const toBot = !coached.includes(trade.to);
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
      {pending && toBot && <p className="dim tcard-bot">🤖 Computer-run team: it can't answer until AI coaches are built.{commish ? ' You can accept or veto it.' : ''}</p>}
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
              <ConfirmButton className="btn small" label={`✅ Accept for ${to.code}`} title={`Accept this trade on behalf of the ${to.name}?`} yes="Accept for them"
                text="Use this for computer-run teams until AI coaches exist, or to settle it yourself." onConfirm={() => done(() => commishTrade(trade.id, true))} />
              <ConfirmButton className="btn small ghost" label="⛔ Veto" title="Veto this trade?" yes="Veto it" text="Both coaches are told the commissioner vetoed it." onConfirm={() => done(() => commishTrade(trade.id, false))} />
            </>
          )}
        </div>
      )}
    </article>
  );
}
