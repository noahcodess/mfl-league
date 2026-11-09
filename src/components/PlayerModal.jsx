import React, { useEffect } from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import MoodTag from './MoodTag.jsx';
import { capHit } from '../data/players.js';
import { POSITION_NAMES } from '../data/positions.js';
import { money, plural } from '../lib/format.js';
import { flagFor } from '../lib/flags.js';

// Full player card: bio, rating, contract and cap hit. Potential only shows to the player's own team and the commissioner.
export default function PlayerModal({ player, team, canSeePotential, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!player) return null;
  const c = player.contract;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal pcard" style={{ '--team': team.color, '--team-accent': team.accent }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        <div className="pcard-head">
          <Headshot player={player} team={team} size={104} />
          <div>
            <div className="pcard-num">#{player.number ?? '-'} · {POSITION_NAMES[player.position] || player.position}</div>
            <h2>{player.name}</h2>
            <div className="pcard-team">{team.name} · {player.depth === 'starter' ? 'Starter' : 'Backup'}</div>
            <StarRating value={player.stars} elite={player.elite} showNumber />
          </div>
        </div>
        <div className="pcard-grid">
          <div><span>Age</span><b>{player.age ?? '-'}</b></div>
          <div><span>Country</span><b>{flagFor(player.nationality || 'USA')} {player.nationality || 'USA'}</b></div>
          <div><span>Mood</span><b><MoodTag mood={player.mood} /></b></div>
          <div><span>Potential</span><b>{canSeePotential ? <span className="dim">Not set yet</span> : '🔒 Hidden'}</b></div>
        </div>
        <h3>Contract</h3>
        {c ? (
          <div className="pcard-grid">
            <div><span>Length</span><b>{plural(c.years, 'year')}</b></div>
            <div><span>Total</span><b>{money(c.total)}</b></div>
            <div className="hl"><span>Cap hit / year</span><b>{money(capHit(player))}</b></div>
          </div>
        ) : <p className="dim">No contract on file.</p>}
        {!canSeePotential && <p className="pcard-note">Potential is only visible to this player's team. Scouting will reveal it.</p>}
        {player.notes.length > 0 && <ul className="pcard-flags">{player.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      </div>
    </div>
  );
}
