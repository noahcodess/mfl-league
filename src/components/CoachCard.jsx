import React, { useState } from 'react';
import CoachSprite from './CoachSprite.jsx';
import CoachModal from './CoachModal.jsx';
import StarRating from './StarRating.jsx';
import { useCoaches, coachStars } from '../data/coaches.js';

// "You're the coach" card on the team hub (or "Head coach" on any team page). Tap it for his profile.
export default function CoachCard({ team, mine }) {
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const coaches = useCoaches(version);
  const coach = coaches?.[team.id];
  if (!coach) return null;
  return (
    <>
      <button type="button" className="coach-card" style={{ '--team': team.color, '--team-accent': team.accent }} onClick={() => setOpen(true)}>
        <div className="coach-card-stage"><CoachSprite coach={coach} team={team} height={104} bob /></div>
        <div className="coach-card-body">
          <small>{mine ? "You're the coach" : 'Head coach'}</small>
          <b>Coach {coach.name}</b>
          <StarRating value={coachStars(coach.ratings)} showNumber />
          <span className="coach-card-cta">{mine ? 'Tap to see your ratings and change your outfit →' : 'Tap for his profile →'}</span>
        </div>
      </button>
      {open && <CoachModal coach={coach} team={team} mine={mine} onClose={() => setOpen(false)} onSaved={() => setVersion((v) => v + 1)} />}
    </>
  );
}
