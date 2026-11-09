import React from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { capHit, isRetiring } from '../data/players.js';
import { money } from '../lib/format.js';
import { askingPrice } from '../lib/marketValue.js';

// Coach-only lists: contracts in their final year (re-sign candidates) and players aging out this offseason.
function Row({ p, team, potential, onOpen, right }) {
  return (
    <button className="watch-row" onClick={() => onOpen(p)}>
      <Headshot player={p} team={team} size={32} />
      <span className="watch-name"><b>{p.name}</b><small>{p.position} · Age {p.age ?? '-'}</small></span>
      <span className="watch-stars"><StarRating value={p.stars} elite={p.elite} />{potential != null && potential > p.stars && <small>→ <StarRating value={potential} /></small>}</span>
      <span className="watch-right">{right}</span>
    </button>
  );
}

export default function ContractWatch({ players, team, potentials, onOpen }) {
  const retiring = players.filter(isRetiring);
  const expiring = players.filter((p) => p.contract?.years === 1 && !isRetiring(p)).sort((a, b) => (b.stars || 0) - (a.stars || 0));
  return (
    <div className="two-col">
      <section className="card">
        <h3>Final contract year <span className="count">{expiring.length}</span></h3>
        <p className="dim help">Re-sign them during the re-signing period, or they hit free agency.</p>
        {expiring.length ? expiring.map((p) => (
          <Row key={p.id} p={p} team={team} potential={potentials[p.id]} onOpen={onOpen}
            right={<><span className="dim">{money(capHit(p))} → <b className="ask">{money(askingPrice(p, potentials[p.id]))}</b>/yr</span><button className="btn small ghost" disabled title="Opens in the re-signing period">Re-sign</button></>} />
        )) : <p className="dim">Nobody. Everyone is signed past this season.</p>}
      </section>
      <section className="card">
        <h3>Aging out <span className="count">{retiring.length}</span></h3>
        <p className="dim help">They turn 28 on Birthday Day and retire. Plan their replacements.</p>
        {retiring.length ? retiring.map((p) => (
          <Row key={p.id} p={p} team={team} onOpen={onOpen} right={<span className="ret-tag">RET</span>} />
        )) : <p className="dim">No retirements this year.</p>}
      </section>
    </div>
  );
}
