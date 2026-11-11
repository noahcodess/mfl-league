import React from 'react';
import ShowMore from './ShowMore.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { capHit, isRetiring } from '../data/players.js';
import { isExpiring } from '../data/contracts.js';
import { resignOpen } from '../data/teams.js';
import { money } from '../lib/format.js';
import { askingPrice } from '../lib/marketValue.js';

// Coach-only lists: players whose contracts end this offseason (re-sign or lose them) and players aging out.
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

const CHIP = { open: 'Talking', agreed: 'Agreed', approved: 'Signed', walked: 'Walked', denied: 'Denied' };

export default function ContractWatch({ players, team, potentials, traits = {}, negotiations = [], onOpen, onNegotiate }) {
  const talkOf = (id) => negotiations.find((n) => n.player_id === id && n.status !== 'denied');
  const retiring = players.filter(isRetiring);
  const expiring = players.filter((p) => isExpiring(p) && !isRetiring(p)).sort((a, b) => (b.stars || 0) - (a.stars || 0));
  const windowOpen = resignOpen();
  return (
    <div className="two-col">
      <section className="card">
        <h3>Contracts ending <span className="count">{expiring.length}</span></h3>
        <p className="dim help">{windowOpen ? 'The re-signing window is open. Anyone not re-signed hits free agency when it closes.' : 'Their deals end this offseason. Re-sign them when the re-signing window opens, or they hit free agency.'}</p>
        {expiring.length ? <ShowMore items={expiring} first={4} render={(p) => (
          <Row key={p.id} p={p} team={team} potential={potentials[p.id]} onOpen={onOpen}
            right={<>
              {talkOf(p.id) && <span className={`nego-chip ${talkOf(p.id).status}`}>{CHIP[talkOf(p.id).status]}</span>}
              <span className="dim">{capHit(p) ? <>{money(capHit(p))} → </> : null}<b className="ask">{money(askingPrice(p, potentials[p.id], traits[p.id]))}</b>/yr</span>
              <button className="btn small" disabled={!windowOpen} title={windowOpen ? 'Open talks' : 'Opens at the Re-signing step'}
                onClick={(e) => { e.stopPropagation(); onNegotiate?.(p); }}>{talkOf(p.id) ? 'Talks' : 'Re-sign'}</button>
            </>} />
        )} /> : <p className="dim">Nobody. Everyone is signed through next season.</p>}
      </section>
      <section className="card">
        <h3>Aging out <span className="count">{retiring.length}</span></h3>
        <p className="dim help">They turn 28 at Birthday & Farewell and retire. Plan their replacements.</p>
        {retiring.length ? retiring.map((p) => (
          <Row key={p.id} p={p} team={team} onOpen={onOpen} right={<span className="dim">Final season</span>} />
        )) : <p className="dim">No retirements this year.</p>}
      </section>
    </div>
  );
}
