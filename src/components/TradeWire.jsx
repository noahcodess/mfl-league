import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';
import { wireKey } from '../data/tradeWire.js';
import { openTradeBuilder } from '../data/trades.js';

const ago = (iso) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60e3)); return m < 1 ? 'just now' : `${m} min ago`; };

// Commissioner's draft room → Trade wire tab: every offer sent tonight and every trade that went through. Private to him.
export default function TradeWire({ wire, isCoach }) {
  return (
    <div className="trade-wire">
      <div className="tw-head">
        <p className="dim">🔒 Only you see this. Offers show up here and pop up as breaking news the moment they're sent; announce the ones you want on stage.</p>
        {isCoach && <button className="btn" onClick={() => openTradeBuilder({})}>🔁 Make a trade</button>}
      </div>
      {!wire.length ? <p className="dim">No trade talk yet tonight.</p> : (
        <ul>
          {wire.map((w) => {
            const a = getTeam(w.from_team), b = getTeam(w.to_team);
            return (
              <li key={wireKey(w)} className={`tw-${w.kind}`}>
                <span className="tw-teams"><TeamBadge team={a} size="sm" />{w.kind === 'accepted' ? '⇄' : '→'}<TeamBadge team={b} size="sm" /></span>
                <div>
                  <b>{w.kind === 'offer' ? `${a?.name} sent an offer to the ${b?.name}` : w.kind === 'accepted' ? `Trade: ${a?.name} and ${b?.name}` : `${b?.name} turned down the ${a?.name}`}</b>
                  {w.kind === 'accepted' && <small>{a?.code} get {w.from_gets || 'nothing'} · {b?.code} get {w.to_gets || 'nothing'}</small>}
                </div>
                <small className="dim">{ago(w.at)}</small>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
