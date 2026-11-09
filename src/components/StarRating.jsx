import React from 'react';

// Shows a 0-5 star rating with half stars; 5 gold stars marks an elite player.
export default function StarRating({ value, elite }) {
  if (value == null) return <span className="stars none">No rating</span>;
  const full = Math.floor(value), half = value - full >= 0.5;
  return (
    <span className={`stars ${elite ? 'elite' : ''}`} title={`${value} stars`}>
      {'★'.repeat(full)}{half && <span className="half">★</span>}
      <span className="stars-num">{value.toFixed(1)}</span>
    </span>
  );
}
