import React from 'react';
import { ordinal } from '../lib/format.js';

// Draft picks a team owns, grouped by season; picks from other teams show "via".
export default function PickList({ picks, ownCode }) {
  const seasons = [...new Set(picks.map((p) => p.season))];
  return (
    <section className="card">
      <h3>Draft picks</h3>
      <div className="picks">
        {seasons.map((s) => (
          <div className="pick-season" key={s}>
            <span className="pick-s">S{s}</span>
            {picks.filter((p) => p.season === s).map((p, i) => (
              <span key={i} className={`pick ${p.originalCode !== ownCode ? 'via' : ''}`}>
                {ordinal(p.round)}{p.originalCode !== ownCode && <small> via {p.originalCode}</small>}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
