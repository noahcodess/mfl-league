import React from 'react';
import { trophyImg } from '../data/craftBowls.js';

// A row of Craft Bowl trophies (one per title) with a count; hover shows the seasons. Nothing if there are no titles.
export default function TrophyCase({ titles, size = 26, label }) {
  if (!titles?.length) return null;
  const seasons = titles.map((t) => (t.season ? `S${t.season}` : 'S?')).join(', ');
  return (
    <span className="trophies" title={`${titles.length} Craft Bowl${titles.length === 1 ? '' : 's'}: ${seasons}`}>
      {titles.slice(0, 6).map((t) => <img key={t.id} src={trophyImg()} alt="Craft Bowl" height={size} />)}
      <b>{titles.length}× {label || 'Craft Bowl champ'}</b>
    </span>
  );
}
