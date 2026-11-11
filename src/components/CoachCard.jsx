import React, { useState } from 'react';
import CoachSprite from './CoachSprite.jsx';
import CoachModal from './CoachModal.jsx';
import StarRating from './StarRating.jsx';
import WhoTag from './WhoTag.jsx';
import { useCoachBrain } from '../data/coachBrain.js';
import { archetype, teamMode } from '../lib/botBrain.js';
import { useCoaches, coachStars } from '../data/coaches.js';
import { useCoachedTeams } from '../data/coached.js';

// "You're the coach" card on the team hub (or "Head coach" on any team page, with a bot's plan and type). Tap it for his profile.
export default function CoachCard({ team, mine }) {
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const coaches = useCoaches(version);
  const coach = coaches?.[team.id];
  const human = useCoachedTeams().includes(team.id);
  const brain = useCoachBrain(team.id);
  if (!coach) return null;
  return (
    <>
      <button type="button" className="coach-card" style={{ '--team': team.color, '--team-accent': team.accent }} onClick={() => setOpen(true)}>
        <div className="coach-card-stage"><CoachSprite coach={coach} team={team} height={104} bob /></div>
        <div className="coach-card-body">
          <small>{mine ? "You're the coach" : 'Head coach'}</small>
          <b>Coach {coach.name} <WhoTag human={human} reserved={team.reserved} /></b>
          <StarRating value={coachStars(coach.ratings)} showNumber />
          {brain && !human && <span className="coach-card-plan">{teamMode(brain.mode).icon} {teamMode(brain.mode).name} · {archetype(brain.brain?.archetype).name}</span>}
          <span className="coach-card-cta">{mine ? 'Tap to see your ratings and change your outfit →' : 'Tap for his profile →'}</span>
        </div>
      </button>
      {open && <CoachModal coach={coach} team={team} mine={mine} onClose={() => setOpen(false)} onSaved={() => setVersion((v) => v + 1)} />}
    </>
  );
}
