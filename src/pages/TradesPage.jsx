import React, { useEffect, useState } from 'react';
import Tabs from '../components/Tabs.jsx';
import TradeCard from '../components/TradeCard.jsx';
import TradeAsset from '../components/TradeAsset.jsx';
import TeamBadge from '../components/TeamBadge.jsx';
import CommishTrades from '../components/CommishTrades.jsx';
import { useTrades, useTradeMarks, openTradeBuilder, toggleUntouchable, toggleTradeBlock } from '../data/trades.js';
import { useCoachedTeams } from '../data/coached.js';
import { store } from '../data/store.js';
import { getTeam } from '../data/teams.js';

// Trade center: offers to you, your offers, the league's trade block, done deals, and your untouchables / block. Icons with hover tips, few words.
const Num = ({ n }) => <span className={`tab-num${n ? ' on' : ''}`}>{n}</span>;
const Tip = ({ text }) => <span className="tip-i" title={text} aria-label={text}>ⓘ</span>;
export default function TradesPage({ viewer, canControl }) {
  const myTeam = viewer?.role === 'coach' ? viewer.team_id : null;
  const [version, setVersion] = useState(0);
  const trades = useTrades(`${viewer?.user_id}-${myTeam}`, version);
  const marks = useTradeMarks(version);
  const coached = useCoachedTeams();
  useEffect(() => {
    const on = () => setVersion((v) => v + 1);
    window.addEventListener('mfl-trade-sent', on);
    return () => window.removeEventListener('mfl-trade-sent', on);
  }, []);
  const bump = () => setVersion((v) => v + 1);
  const all = trades || [];
  const byId = Object.fromEntries(store.league.players.map((p) => [p.id, p]));
  const blockPlayers = [...marks.block.keys()].map((id) => byId[id]).filter(Boolean).sort((a, b) => b.stars - a.stars);
  const mine = (set) => [...set.keys()].map((id) => byId[id]).filter((p) => p && p.teamId === myTeam);
  const list = (rows, empty) => (rows.length ? rows.map((t) => <TradeCard key={t.id} trade={t} myTeamId={myTeam} coached={coached} onChange={bump} />) : <p className="dim">{empty}</p>);

  return (
    <div className="trades-page">
      <div className="page-head">
        <h1>Trades</h1>
        <span className={`trade-state ${marks.open ? 'open' : 'closed'}`} title={marks.open ? 'Trading is open' : 'Trading is closed'}>{marks.open ? '🟢 Open' : '🔴 Closed'}</span>
        {myTeam && <button className="btn" onClick={() => openTradeBuilder({})}>🔁 New</button>}
      </div>
      <div className="two-col wide-left">
        <section className="card">
          <Tabs tabs={[
            ...(myTeam ? [
              { key: 'in', title: 'Offers to you', label: <>📥 <Num n={all.filter((t) => t.to === myTeam && t.status === 'pending').length} /></>, render: () => list(all.filter((t) => t.to === myTeam), 'No offers yet.') },
              { key: 'out', title: 'Your offers', label: <>📤 <Num n={all.filter((t) => t.from === myTeam && t.status === 'pending').length} /></>, render: () => list(all.filter((t) => t.from === myTeam), "You haven't sent any trades.") },
            ] : []),
            { key: 'block', title: 'Trade block', label: <>📣 <Num n={blockPlayers.length} /></>, render: () => (
              <div className="block-list">
                {!blockPlayers.length && <p className="dim">Nobody is on the block right now.</p>}
                {blockPlayers.map((p) => (
                  <div key={p.id} className="block-row">
                    <TeamBadge team={getTeam(p.teamId)} size="sm" />
                    <TradeAsset item={p} />
                    {myTeam && p.teamId !== myTeam && <button className="btn small" title="Make an offer" onClick={() => openTradeBuilder({ teamId: p.teamId, player: p })}>🔁</button>}
                  </div>
                ))}
              </div>
            ) },
            { key: 'done', title: 'League trades', label: <>🤝 <Num n={all.filter((t) => t.status === 'accepted').length} /></>, render: () => list(all.filter((t) => t.status === 'accepted'), 'No trades have gone through yet.') },
            ...(canControl ? [{ key: 'commish', title: 'Commissioner', label: '🎛️', render: () => <CommishTrades canControl={canControl} /> }] : []),
          ]} />
        </section>
        {myTeam && (
          <aside className="card my-marks">
            <h3 title="Other teams can't ask for these players. Set them from a player's card.">🔒 <span className="count">{mine(marks.untouchables).length}/2</span> <Tip text="Other teams can't ask for these players. Set them from a player's card." /></h3>
            {mine(marks.untouchables).map((p) => <div key={p.id} className="mark-row"><TradeAsset item={p} /><button className="btn small ghost" title="Remove" onClick={async () => { await toggleUntouchable(p.id); bump(); }}>✕</button></div>)}
            <h3 title="Your trade block">📣 <span className="count">{mine(marks.block).length}</span> <Tip text="Your trade block. Putting a 3.5★+ player here tells the whole league." /></h3>
            {mine(marks.block).map((p) => <div key={p.id} className="mark-row"><TradeAsset item={p} /><button className="btn small ghost" title="Remove" onClick={async () => { await toggleTradeBlock(p.id); bump(); }}>✕</button></div>)}
          </aside>
        )}
      </div>
    </div>
  );
}
