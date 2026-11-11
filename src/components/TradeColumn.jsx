import React, { useState } from 'react';
import TradeAsset from './TradeAsset.jsx';
import TeamBadge from './TeamBadge.jsx';

// One side of the trade builder: a team's players and picks to tap into the trade (up to the max), with a search.
// Their untouchables are locked; players on the trade block get a 📣.
export default function TradeColumn({ title, team, assets, chosen, max, onToggle, untouchables, block, lockUntouchables }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('players');
  const has = (x) => chosen.some((c) => c.id === x.id);
  const full = chosen.length >= max;
  const players = assets.players.filter((p) => !q || `${p.name} ${p.position}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="tcol" style={{ '--team': team?.color }}>
      <div className="tcol-head">
        {team && <TeamBadge team={team} size="md" />}
        <div><small>{title}</small><b>{team?.name}</b></div>
        <span className={`tcol-count${full ? ' full' : ''}`}>{chosen.length}/{max}</span>
      </div>
      <div className="tcol-chosen">
        {chosen.length ? chosen.map((x) => <TradeAsset key={x.id} item={x} big selected onClick={() => onToggle(x)} />)
          : <p className="dim">Tap players or picks below to add them (up to {max}).</p>}
        {Array.from({ length: Math.max(0, max - chosen.length) }).map((_, i) => chosen.length > 0 && <div key={i} className="tslot" />)}
      </div>
      <div className="seg small">
        <button className={tab === 'players' ? 'on' : ''} onClick={() => setTab('players')}>Players ({assets.players.length})</button>
        <button className={tab === 'picks' ? 'on' : ''} onClick={() => setTab('picks')}>Picks ({assets.picks.length})</button>
      </div>
      {tab === 'players' && <input className="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="tcol-list">
        {(tab === 'players' ? players : assets.picks).filter((x) => !has(x)).map((x) => (
          <TradeAsset key={x.id} item={x} locked={lockUntouchables && untouchables.has(x.id)} tag={block.has(x.id) ? <span title="On the trade block"> 📣</span> : null}
            onClick={full ? undefined : () => onToggle(x)} />
        ))}
      </div>
    </div>
  );
}
