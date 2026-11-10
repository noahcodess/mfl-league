import React from 'react';
import { store } from '../data/store.js';
import { faOpen, maxOpenOffers } from '../data/freeAgency.js';
import { money } from '../lib/format.js';

// Side panel on the free agent market: how it works, plus this coach's offers (out now, signed, lost).
const STATUS = { open: 'Out', won: 'He picked you', lost: 'Went elsewhere', withdrawn: 'Pulled', expired: 'Expired' };

export default function MyOffers({ team, offers, onOpen }) {
  const season = store.league.meta.currentSeason;
  const mine = offers.filter((o) => o.season === season && o.status !== 'withdrawn');
  const out = mine.filter((o) => o.status === 'open').length;
  const nameOf = (id) => store.league.players.find((p) => p.id === id)?.name || 'Unknown player';
  return (
    <section className="card fa-side">
      <h3>How free agency works</h3>
      <ul className="fa-rules">
        <li>💸 Make up to {maxOpenOffers()} offers at a time, any size that fits your cap.</li>
        <li>🔁 The commissioner runs a few rounds. Each round every player picks the best offer he'll take.</li>
        <li>⭐ Money matters most, but starting jobs, winning teams and old teams matter too.</li>
        <li>📉 Nobody bites? Players get less picky every round. Big names may wait out round 1.</li>
        <li>✅ Signings go to the commissioner to approve, like re-signings.</li>
      </ul>
      {team && (
        <>
          <h3>Your offers <span className="count">{out}/{maxOpenOffers()}</span></h3>
          {!mine.length && <p className="dim">{faOpen() ? 'No offers yet. Click a player to make one.' : 'Nothing yet this offseason.'}</p>}
          {mine.map((o) => (
            <button key={o.id} className={`offer-row ${o.status}`} onClick={() => onOpen(o.player_id)}>
              <b>{nameOf(o.player_id)}</b>
              <small>{o.years} yr · {money(o.per_year)}/yr · {o.role}</small>
              <span className={`offer-status ${o.status}`}>{STATUS[o.status]}</span>
            </button>
          ))}
        </>
      )}
    </section>
  );
}
