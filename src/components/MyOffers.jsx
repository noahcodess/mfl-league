import React from 'react';
import { store } from '../data/store.js';
import { faOpen, offerLimit } from '../data/freeAgency.js';
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
      <details className="fa-how-box">
      <summary>How free agency works</summary>
      <ul className="fa-rules">
        <li>💸 Offers you can have out: 3 in round 1, 10 in round 2, then as many as you have roster spots.</li>
        <li>🔁 The commissioner runs a few rounds. Each round every player picks the best offer he'll take.</li>
        <li>⭐ Each player has a personality: some chase rings, some want to start, some only want money.</li>
        <li>📊 The top of a player's bidding board is the team he likes most, and that team gets him.</li>
        <li>🚪 Let a guy go without an offer and he may refuse to come back this offseason.</li>
        <li>📉 Nobody bites? Players get less picky every round. Big names may wait it out.</li>
        <li>✅ Signings go to the commissioner to approve, like re-signings.</li>
      </ul>
      </details>
      {team && (
        <>
          <h3>Your offers <span className="count">{out}{offerLimit() ? `/${offerLimit()}` : ''}</span></h3>
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
