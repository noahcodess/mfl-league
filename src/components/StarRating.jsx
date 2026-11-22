import React from 'react';
import StarIcon from './StarIcon.jsx';

// Shows a 0-5 star rating, always gold: whole stars, then a half star (half gold, half empty) for a .5. Only a full 5 stars
// glows (now or potential, anywhere). It shows what he IS: a player who dropped from 4 to 3 shows 3 stars (no red "lost"
// stars). The number only shows when asked. (`elite`, `declining` and `peak` are no longer used.)
export default function StarRating({ value, showNumber }) {
  if (value == null) return <span className="stars none">No rating</span>;
  const v = Math.max(0, Math.min(5, Math.round(value * 2) / 2)), whole = Math.floor(v), half = v - whole >= 0.5;
  return (
    <span className={`stars${v >= 5 ? ' elite' : ''}`} title={`${v} stars`}>
      {Array.from({ length: whole }, (_, k) => <StarIcon key={k} />)}
      {half && <StarIcon half />}
      {showNumber && <span className="stars-num">{v.toFixed(1)}</span>}
    </span>
  );
}
