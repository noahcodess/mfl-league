import React from 'react';
import { useStadiums, capacityText } from '../data/stadiums.js';

// Team page → the team's stadium: its name and how many it holds. The field itself is only shown in games (and on the
// commissioner's stadium editor); every field looks about the same, so the team page doesn't need it.
export default function StadiumCard({ team }) {
  const st = useStadiums()[team.id];
  if (!st) return null;
  return (
    <section className="card stadium-card">
      <header className="sc-head">
        <div><h3>🏟️ {st.name}</h3><small className="dim">Home of the {team.name} · holds {capacityText(st.capacity)}</small></div>
      </header>
    </section>
  );
}
