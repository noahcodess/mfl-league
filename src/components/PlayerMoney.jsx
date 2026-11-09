import React from 'react';
import { marketValue, askingPrice, preferredYears } from '../lib/marketValue.js';
import { traitsFor, topPriority } from '../lib/playerTraits.js';
import { maxAge } from '../data/players.js';
import { money, plural } from '../lib/format.js';

// Player card money section. Everyone sees market value; insiders also see his ask and what he cares about.
function Bar({ label, value }) {
  return (
    <div className="prio">
      <span>{label}</span>
      <span className="prio-track"><span className="prio-fill" style={{ width: `${Math.round(value * 100)}%` }} /></span>
      <b>{Math.round(value * 100)}%</b>
    </div>
  );
}

export default function PlayerMoney({ player, potential, insider }) {
  const value = marketValue(player);
  if (value == null) return null;
  const t = traitsFor(player);
  const ask = askingPrice(player, potential);
  const greed = t.greed >= 1.1 ? 'Greedy' : t.greed <= 0.95 ? 'Team-friendly' : 'Fair';
  return (
    <>
      <h3>Market</h3>
      <div className="pcard-grid">
        <div><span>Market value</span><b>{money(value)}/yr</b></div>
        {insider && <div className="hl"><span>He'd ask for</span><b>{money(ask)}/yr</b></div>}
        {insider && <div><span>Wants</span><b>{plural(preferredYears(player, potential, maxAge()), 'year')}</b></div>}
      </div>
      {insider && (
        <div className="prios">
          <div className="prios-head"><span>What he cares about</span><small>Cares most about {topPriority(t).toLowerCase()} · {greed}</small></div>
          <Bar label="Money" value={t.money} />
          <Bar label="Playing time" value={t.playingTime} />
          <Bar label="Coach legacy" value={t.legacy} />
        </div>
      )}
    </>
  );
}
