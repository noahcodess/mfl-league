import React from 'react';
import Modal from './Modal.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import PlayerSkills from './PlayerSkills.jsx';
import ScoutButton from './ScoutButton.jsx';
import Tabs from './Tabs.jsx';
import { FA_JERSEY } from './FaOfferModal.jsx';
import { POSITION_NAMES } from '../data/positions.js';
import { heightLabel } from '../lib/format.js';
import { flagFor } from '../lib/flags.js';

// A draft prospect's card: bio, then tabs for the scouting report (college season, honors, send a scout) and ratings.
export default function ProspectModal({ player, potential, scouts, scouted, onScouted, onClose }) {
  const cs = player.collegeStats || {};
  return (
    <Modal onClose={onClose} className="pcard" style={{ '--team': FA_JERSEY.color, '--team-accent': '#d6cf4c' }}>
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <div className="pcard-head">
        <Headshot player={player} team={FA_JERSEY} size={128} />
        <div>
          <div className="pcard-num">Draft prospect · {POSITION_NAMES[player.position] || player.position}</div>
          <h2>{player.name}</h2>
          <div className="pcard-team">{player.college} · {cs.class || 'Senior'}</div>
          <StarRating value={player.stars} showNumber />
        </div>
      </div>
      <div className="pcard-grid">
        <div><span>Age</span><b>{player.age}</b></div>
        <div><span>Height</span><b>{heightLabel(player.height)}</b></div>
        <div><span>Weight</span><b>{player.weight ? `${player.weight} lbs` : '-'}</b></div>
        <div><span>Country</span><b>{flagFor(player.nationality || 'USA')} {player.nationality || 'USA'}</b></div>
        <div className="pot"><span>Potential</span><b>{potential != null ? <StarRating value={potential} elite={potential === 5} /> : '🔒 Scout him'}</b></div>
      </div>
      <Tabs tabs={[
        { key: 'report', label: 'Scouting report', render: () => (
          <>
            <div className="college">
              <div className="college-head">Last college season · {player.college}</div>
              <div className="college-stats">
                <div><span>Games</span><b>{cs.games ?? '-'}</b></div>
                {(cs.stats || []).map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
              </div>
              {cs.honors?.length > 0 && <div className="honors">{cs.honors.map((h) => <span key={h} className="honor">🏅 {h}</span>)}</div>}
            </div>
            {scouts && <ScoutButton player={player} left={scouts.draft} scouted={scouted} known={potential != null} onScouted={onScouted} />}
          </>
        ) },
        { key: 'ratings', label: 'Ratings', render: () => <PlayerSkills player={player} potential={potential} /> },
      ]} />
    </Modal>
  );
}
