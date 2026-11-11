import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Tabs from './Tabs.jsx';
import CoachSprite from './CoachSprite.jsx';
import CoachOutfit from './CoachOutfit.jsx';
import CoachScheme from './CoachScheme.jsx';
import AttributeBars from './AttributeBars.jsx';
import StarRating from './StarRating.jsx';
import WhoTag from './WhoTag.jsx';
import CoachBrain from './CoachBrain.jsx';
import { useCoachedTeams } from '../data/coached.js';
import { COACH_RATINGS, coachStars } from '../data/coaches.js';
import { schemeName, OFFENSES, DEFENSES } from '../lib/schemes.js';

// A coach's profile: sprite, Player/Bot tag, stars and potential, then tabs: his 5 ratings (same bars as players, the outline
// is how high he can grow), his front office brain, his scheme, and (your own coach) the outfit picker.
export default function CoachModal({ coach, team, mine, onClose, onSaved }) {
  const [preview, setPreview] = useState(null);
  const human = useCoachedTeams().includes(team.id);
  const pot = Number(coach.potential);
  const ceiling = Math.min(99, 28 + pot * 13);
  const ceilings = Object.fromEntries(COACH_RATINGS.map(([k]) => [k, ceiling]));
  const tips = Object.fromEntries(COACH_RATINGS.map(([k, label, what]) => [k, `${label}: ${what}`]));
  const s = coach.scheme || {};
  return (
    <Modal onClose={onClose} className="coach-modal" style={{ '--team': team.color, '--team-accent': team.accent }}>
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <div className="coach-head">
        <div className="coach-stage"><CoachSprite coach={coach} team={team} looks={preview} height={150} bob /></div>
        <div className="coach-id">
          <div className="coach-role">Head coach · {team.name}</div>
          <h2>Coach {coach.name}</h2>
          <WhoTag human={human} reserved={team.reserved} />
          <div className="coach-stars"><span>Now</span><StarRating value={coachStars(coach.ratings)} showNumber /></div>
          <div className="coach-stars"><span>Potential</span><StarRating value={pot} elite={pot === 5} showNumber /></div>
          <div className="coach-scheme-line">🏈 {schemeName(OFFENSES, s.offense)} · 🛡️ {schemeName(DEFENSES, s.defense)}{s.auto !== false ? ' · Auto' : ''}</div>
        </div>
      </div>
      <Tabs tabs={[
        { key: 'ratings', label: 'Ratings', render: () => (
          <div className="coach-ratings">
            <AttributeBars defs={COACH_RATINGS.map(([k, label]) => [k, label])} ratings={coach.ratings} ceilings={ceilings} tips={tips} title={null} />
            <ul className="coach-legend">{COACH_RATINGS.map(([k, label, what]) => <li key={k}><b>{label}</b> {what}</li>)}</ul>
          </div>
        ) },
        { key: 'brain', label: 'Front Office', render: () => <CoachBrain teamId={team.id} /> },
        { key: 'scheme', label: 'Scheme', render: () => <CoachScheme coach={coach} team={team} mine={mine} onSaved={onSaved} /> },
        ...(mine ? [{ key: 'outfit', label: 'Outfit', render: () => <CoachOutfit coach={coach} team={team} onPreview={setPreview} onSaved={onSaved} /> }] : []),
      ]} />
    </Modal>
  );
}
