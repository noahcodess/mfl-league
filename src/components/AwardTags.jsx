// The 🏆 tags on a player's card, one per award he's won. Hover (or tap) one to see which: "Season 8 MVP".
import React, { useState } from 'react';
import { usePlayerAwards } from '../data/awardWinners.js';

const SHORT = { mvp: 'MVP', opoy: 'Offensive Player of the Year', dpoy: 'Defensive Player of the Year', roy: 'Rookie of the Year', coy: 'Coach of the Year', goty: 'Game of the Year' };

export default function AwardTags({ playerId }) {
  const wins = usePlayerAwards(playerId), [open, setOpen] = useState(null);
  if (!wins.length) return null;
  return (
    <div className="aw-tags">
      {wins.map((w) => {
        const label = `Season ${w.season} ${SHORT[w.award] || w.award}`, k = `${w.season}-${w.award}`;
        return (
          <button key={k} className={`aw-tag${w.award === 'mvp' ? ' mvp' : ''}${open === k ? ' open' : ''}`} title={label} onClick={() => setOpen(open === k ? null : k)}>
            🏆<span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
