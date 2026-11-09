import React from 'react';
import PlayerTile from './PlayerTile.jsx';
import { OFFENSE, DEFENSE, POSITION_NAMES } from '../data/positions.js';

// The team's roster by side (offense, defense), position order, starters before backups. Open slots show as empty spots.
function order(list, positions) {
  const rank = (x) => positions.indexOf(x.position) * 100 + (x.depth === 'starter' ? 0 : 50) + (x.slot || 0);
  return list.filter((x) => positions.includes(x.position)).sort((a, b) => rank(a) - rank(b));
}

function Side({ title, positions, players, vacancies, team, onOpen }) {
  const list = order(players, positions);
  const open = order(vacancies, positions);
  return (
    <section className="card">
      <h3>{title} <span className="count">{list.length}</span></h3>
      <div className="roster-grid">
        {list.map((p, i) => <PlayerTile key={p.id} player={p} team={team} index={i} onOpen={onOpen} />)}
        {open.map((v) => (
          <div key={`${v.position}-${v.depth}-${v.slot}`} className="ptile open" title={`Open ${POSITION_NAMES[v.position]} spot`}>
            <span className="open-pos">{v.position}</span><span className="dim">Open {v.depth} spot</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Roster({ players, vacancies, team, onOpen }) {
  return (
    <>
      <Side title="Offense" positions={OFFENSE} players={players} vacancies={vacancies} team={team} onOpen={onOpen} />
      <Side title="Defense" positions={DEFENSE} players={players} vacancies={vacancies} team={team} onOpen={onOpen} />
    </>
  );
}
