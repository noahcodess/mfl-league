import React from 'react';
import StarRating from './StarRating.jsx';
import { getAllPlayers, capHit } from '../data/players.js';
import { marketValue } from '../lib/marketValue.js';
import { money } from '../lib/format.js';

// League money report: by star rating, what players are paid today vs what they're worth on the market now.
const avg = (list) => (list.length ? list.reduce((s, n) => s + n, 0) / list.length : 0);

export default function MarketReport() {
  const players = getAllPlayers().filter((p) => p.stars != null && p.contract);
  const levels = [...new Set(players.map((p) => p.stars))].sort((a, b) => b - a);
  return (
    <section className="card">
      <h3>Player market</h3>
      <p className="dim help">What each star level is paid today vs. its market value. Market value drives what free agents and re-signing players ask for.</p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Rating</th><th>Players</th><th>Paid today (avg / yr)</th><th>Market value (avg / yr)</th><th>Gap</th></tr></thead>
          <tbody>{levels.map((s) => {
            const group = players.filter((p) => p.stars === s);
            const paid = avg(group.map(capHit)), value = avg(group.map(marketValue));
            const gap = value - paid;
            return (
              <tr key={s}>
                <td><StarRating value={s} elite={s === 5} /></td><td>{group.length}</td><td>{money(paid)}</td><td><b>{money(value)}</b></td>
                <td className={gap > 0 ? 'warn' : 'dim'}>{gap > 0 ? '+' : ''}{money(gap)}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </section>
  );
}
