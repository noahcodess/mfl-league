import React, { useState } from 'react';
import CoachSprite from './CoachSprite.jsx';
import CoachEditor from './CoachEditor.jsx';
import StarRating from './StarRating.jsx';
import WhoTag from './WhoTag.jsx';
import TeamBadge from './TeamBadge.jsx';
import { useCoaches, coachStars } from '../data/coaches.js';
import { useCoachedTeams } from '../data/coached.js';
import { getTeams } from '../data/teams.js';

// Commissioner: every coach in the league with a Player/Bot/Interim tag. Tap one to open the coach maker.
export default function CoachList({ canControl }) {
  const [version, setVersion] = useState(0);
  const [edit, setEdit] = useState(null);
  const coaches = useCoaches(version);
  const coached = useCoachedTeams();
  if (!coaches) return <p className="dim">Loading coaches...</p>;
  return (
    <div>
      <p className="dim">Every team's coach. Coaches can only change their own outfit and scheme (you get a notice when they do). You can change everything here. Reserved teams show N/A until their coach joins; you can still set them up ahead of time.</p>
      <div className="coach-grid">
        {getTeams().map((t) => {
          const c = coaches[t.id];
          if (!c) return null;
          const human = coached.includes(t.id);
          return (
            <button key={t.id} type="button" className="coach-tile" style={{ '--team': t.color }} disabled={!canControl} onClick={() => setEdit(t)}>
              <CoachSprite coach={c} team={t} height={84} />
              <div>
                <span className="coach-tile-team"><TeamBadge team={t} size="xs" /> {t.code}</span>
                <b>{t.reserved && !human ? 'Head coach: N/A' : `Coach ${c.name}`}</b>
                <WhoTag human={human} reserved={t.reserved} />
                <StarRating value={coachStars(c.ratings)} />
              </div>
            </button>
          );
        })}
      </div>
      {edit && <CoachEditor coach={coaches[edit.id]} team={edit} onClose={() => setEdit(null)} onSaved={() => setVersion((v) => v + 1)} />}
    </div>
  );
}
