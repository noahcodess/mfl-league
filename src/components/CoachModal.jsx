import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Tabs from './Tabs.jsx';
import CoachSprite from './CoachSprite.jsx';
import CoachOutfit from './CoachOutfit.jsx';
import CoachScheme from './CoachScheme.jsx';
import { useCoachedTeams } from '../data/coached.js';
import StarRating from './StarRating.jsx';
import { COACH_RATINGS, coachStars } from '../data/coaches.js';
import { outOf10 } from '../lib/format.js';

// A coach's profile: his sprite, Player/Bot tag, stars and potential, the 5 coach ratings (out of 10), his scheme,
// and (for your own coach) the outfit picker.
export default function CoachModal({ coach, team, mine, onClose, onSaved }) {
  const [preview, setPreview] = useState(null);
  const stars = coachStars(coach.ratings);
  const human = useCoachedTeams().includes(team.id);
  return (
    <Modal onClose={onClose} className="coach-modal" style={{ '--team': team.color, '--team-accent': team.accent }}>
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <div className="coach-head">
        <div className="coach-stage"><CoachSprite coach={coach} team={team} looks={preview} height={196} bob /></div>
        <div>
          <div className="coach-role">Head coach · {team.name}</div>
          <h2>Coach {coach.name} <span className={`who-tag ${human ? 'person' : 'bot'}`}>{human ? '👤 Player' : '🤖 Bot'}</span></h2>
          <div className="coach-stars"><span>Rating</span><StarRating value={stars} showNumber /></div>
          <div className="coach-stars"><span>Potential</span><StarRating value={Number(coach.potential)} elite={Number(coach.potential) === 5} showNumber /></div>
          {mine && Number(coach.potential) === 5 && <p className="dim">Coaches run by people can grow into 5★ coaches.</p>}
        </div>
      </div>
      <Tabs tabs={[
        { key: 'ratings', label: 'Ratings', render: () => (
          <div className="coach-ratings">
            <p className="dim">These 5 make up his star rating. Each one only nudges things a little.</p>
            {COACH_RATINGS.map(([k, label, what]) => {
              const v = Number(coach.ratings?.[k]) || 0;
              return (
                <div key={k} className="crow">
                  <div className="crow-top"><b>{label}</b><span>{outOf10(v)}</span></div>
                  <div className="cbar"><i style={{ width: `${v}%` }} /></div>
                  <small className="dim">{what}</small>
                </div>
              );
            })}
          </div>
        ) },
        { key: 'scheme', label: 'Scheme', render: () => <CoachScheme coach={coach} team={team} mine={mine} onSaved={onSaved} /> },
        ...(mine ? [{ key: 'outfit', label: 'Outfit', render: () => <CoachOutfit coach={coach} team={team} onPreview={setPreview} onSaved={onSaved} /> }] : []),
      ]} />
    </Modal>
  );
}
