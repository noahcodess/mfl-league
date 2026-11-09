import React from 'react';
import StarRating from './StarRating.jsx';
import { OFFENSE, DEFENSE, POSITION_NAMES } from '../data/positions.js';

// Starters and backups by position, with open depth slots called out.
function Slot({ player, open }) {
  if (open) return <div className="slot open">Open</div>;
  return (
    <div className={`slot ${player.notes.length ? 'flag' : ''}`} title={player.notes.join('\n')}>
      <span className="slot-name">{player.name}</span>
      <StarRating value={player.stars} elite={player.elite} />
    </div>
  );
}

function Side({ title, positions, players, vacancies }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      <div className="depth">
        <div className="depth-head"><span>Pos</span><span>Starter</span><span>Backup</span></div>
        {positions.flatMap((pos) => {
          const starters = players.filter((p) => p.position === pos && p.depth === 'starter');
          const slotsOf = (depth) => Math.max(0, ...[...players, ...vacancies].filter((x) => x.position === pos && x.depth === depth).map((x) => x.slot));
          const count = Math.max(slotsOf('starter'), slotsOf('backup'), 1);
          return Array.from({ length: count }, (_, i) => {
            const st = starters.find((p) => p.slot === i + 1);
            const bk = players.find((p) => p.position === pos && p.depth === 'backup' && p.slot === i + 1);
            return (
              <div className="depth-row" key={pos + i}>
                <span className="pos" title={POSITION_NAMES[pos]}>{pos}</span>
                <Slot player={st} open={!st} />
                <Slot player={bk} open={!bk} />
              </div>
            );
          });
        })}
      </div>
    </section>
  );
}

export default function DepthChart({ players, vacancies }) {
  return (
    <div className="two-col">
      <Side title="Offense" positions={OFFENSE} players={players} vacancies={vacancies} />
      <Side title="Defense" positions={DEFENSE} players={players} vacancies={vacancies} />
    </div>
  );
}
