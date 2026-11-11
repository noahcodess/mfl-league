import React, { useState } from 'react';
import CoachSprite from './CoachSprite.jsx';
import CoachModal from './CoachModal.jsx';
import StarRating from './StarRating.jsx';
import WhoTag from './WhoTag.jsx';
import TrophyCase from './TrophyCase.jsx';
import { useCraftBowls, coachTitles } from '../data/craftBowls.js';
import { useCoachBrain } from '../data/coachBrain.js';
import { archetype, teamMode } from '../lib/botBrain.js';
import { useCoaches, coachStars } from '../data/coaches.js';
import { useCoachedTeams } from '../data/coached.js';

// "You're the coach" card on the team hub (or "Head coach" on any team page, with a bot's plan and type; N/A for reserved seats). Tap it for his profile.
export default function CoachCard({ team, mine }) {
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const coaches = useCoaches(version);
  const coach = coaches?.[team.id];
  const human = useCoachedTeams().includes(team.id);
  const brain = useCoachBrain(team.id);
  const bowls = useCraftBowls();
  if (!coach) return null;
  if (team.reserved && !human) {
    return (
      <div className="coach-card coach-card-na" style={{ '--team': team.color }}>
        <div className="coach-na-seat">🪑</div>
        <div className="coach-card-body">
          <small>Head coach</small>
          <b>N/A <WhoTag reserved /></b>
          <span className="coach-card-cta">Reserved for a coach joining soon.</span>
        </div>
      </div>
    );
  }
  return (
    <>
      <button type="button" className="coach-card" style={{ '--team': team.color, '--team-accent': team.accent }} onClick={() => setOpen(true)}>
        <div className="coach-card-stage"><CoachSprite coach={coach} team={team} height={104} bob /></div>
        <div className="coach-card-body">
          <small>{mine ? "You're the coach" : 'Head coach'}</small>
          <b>Coach {coach.name} <WhoTag human={human} reserved={team.reserved} /></b>
          <StarRating value={coachStars(coach.ratings)} showNumber />
          <TrophyCase titles={coachTitles(bowls, coach.name)} size={20} label="Craft Bowl champ as coach" />
          {brain && !human && <span className="coach-card-plan">{teamMode(brain.mode).icon} {teamMode(brain.mode).name} · {archetype(brain.brain?.archetype).name}</span>}
          <span className="coach-card-cta">{mine ? 'Tap to see your ratings and change your outfit →' : 'Tap for his profile →'}</span>
        </div>
      </button>
      {open && <CoachModal coach={coach} team={team} mine={mine} onClose={() => setOpen(false)} onSaved={() => setVersion((v) => v + 1)} />}
    </>
  );
}
