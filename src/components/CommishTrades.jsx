import React, { useEffect, useState } from 'react';
import TradeCard from './TradeCard.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { useTrades, useTradeMarks, setTradeWindow } from '../data/trades.js';
import { useCoachedTeams } from '../data/coached.js';

const MODES = [['auto', 'Follow the calendar'], ['open', 'Force open'], ['closed', 'Force closed']];

// Commissioner: the trade window switch and every open trade in the league (veto, or accept for a computer team).
export default function CommishTrades({ canControl, compact }) {
  const [version, setVersion] = useState(0);
  const trades = useTrades('commish', version);
  const marks = useTradeMarks(version);
  const coached = useCoachedTeams();
  useEffect(() => {
    const t = setInterval(() => setVersion((v) => v + 1), 20000);
    return () => clearInterval(t);
  }, []);
  const pending = (trades || []).filter((t) => t.status === 'pending');
  const recent = (trades || []).filter((t) => t.status !== 'pending').slice(0, compact ? 3 : 10);
  return (
    <div className="ctrades">
      {!compact && (
        <div className="ctrades-window">
          <span>Trading is <b className={marks.open ? 'good' : 'bad'}>{marks.open ? 'OPEN' : 'CLOSED'}</b> · mode: {MODES.find(([m]) => m === marks.mode)?.[1]}</span>
          {MODES.filter(([m]) => m !== marks.mode).map(([m, label]) => (
            <ConfirmButton key={m} className="btn small ghost" label={label} disabled={!canControl} title={`${label}?`} yes={label}
              text={m === 'auto' ? 'Trading opens after re-signing (or on the Trades open date) and closes at the trade deadline.' : 'Every coach gets a notice.'}
              onConfirm={async () => { await setTradeWindow(m); setVersion((v) => v + 1); }} />
          ))}
          <p className="dim">Dates live in the Schedule tab: Trades open, and the Trade deadline (between the last game of Week 8 and the first game of Week 9 once games exist). Max 5 items a side, 2 untouchables per team.</p>
        </div>
      )}
      <h3>Open trades <span className="count">{pending.length}</span></h3>
      {!pending.length && <p className="dim">No trades waiting.</p>}
      {pending.map((t) => <TradeCard key={t.id} trade={t} commish={canControl} coached={coached} onChange={() => setVersion((v) => v + 1)} />)}
      {!!recent.length && <h3>Recently decided</h3>}
      {recent.map((t) => <TradeCard key={t.id} trade={t} coached={coached} />)}
    </div>
  );
}
