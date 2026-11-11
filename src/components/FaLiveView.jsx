import React from 'react';
import FreeAgentsPage from '../pages/FreeAgentsPage.jsx';
import { faRound, faRounds } from '../data/freeAgency.js';

// Live during free agency: the round tracker (rounds done, what happens each round), then the full free agent market.
export default function FaLiveView({ viewer }) {
  const round = faRound();
  const rounds = faRounds();
  return (
    <div>
      <section className="card fa-rounds">
        <div className="fa-track">
          {Array.from({ length: rounds }, (_, i) => (
            <div key={i} className={`fa-step${i < round ? ' done' : i === round ? ' now' : ''}`}>
              <b>Round {i + 1}</b><small>{i < round ? 'Done' : i === round ? 'Offers open' : 'Coming'}</small>
            </div>
          ))}
        </div>
        <p className="dim">Send offers now. When the commissioner runs a round, the bots bid and every free agent picks the offer he likes best. Unsigned players carry over to the next round, and asking prices drop.</p>
      </section>
      <FreeAgentsPage viewer={viewer} />
    </div>
  );
}
