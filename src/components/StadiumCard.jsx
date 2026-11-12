import React, { useState } from 'react';
import GameField from './GameField.jsx';
import { useStadiums, capacityText } from '../data/stadiums.js';

// Team page → the team's stadium: its name, how many it holds, and the field through the game camera.
export default function StadiumCard({ team }) {
  const st = useStadiums()[team.id];
  const [blood, setBlood] = useState(false);
  if (!st) return null;
  return (
    <section className="card stadium-card">
      <header className="sc-head">
        <div><h3>🏟️ {st.name}</h3><small className="dim">Home of the {team.name} · holds {capacityText(st.capacity)}</small></div>
        {team.id === 'crf' && <label className="sc-toggle"><input type="checkbox" checked={blood} onChange={(e) => setBlood(e.target.checked)} /> Bloodbath crowd</label>}
      </header>
      <GameField team={team} crowd={blood ? 'bloodbath' : 'normal'} />
      <small className="dim">Drag to look around, scroll or use − and + to zoom.</small>
    </section>
  );
}
