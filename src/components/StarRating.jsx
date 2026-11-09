import React from 'react';
import StarIcon from './StarIcon.jsx';

// Shows a 0-5 star rating with real half stars; gold glow for elite, red when the player is declining.
export default function StarRating({ value, elite, declining }) {
  if (value == null) return <span className="stars none">No rating</span>;
  const full = Math.floor(value), half = value - full >= 0.5;
  const cls = ['stars', elite && 'elite', declining && 'declining'].filter(Boolean).join(' ');
  return (
    <span className={cls} title={`${value} stars`}>
      {Array.from({ length: full }, (_, i) => <StarIcon key={i} />)}
      {half && <StarIcon half />}
      <span className="stars-num">{value.toFixed(1)}</span>
    </span>
  );
}
