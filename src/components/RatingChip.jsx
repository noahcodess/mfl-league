import React from 'react';
import StarRating from './StarRating.jsx';
import { ordinal } from '../lib/format.js';

// One team rating (offense, defense or overall) with its league rank.
export default function RatingChip({ label, rating }) {
  if (!rating) return null;
  return (
    <div className="chip">
      <span className="chip-label">{label}</span>
      <StarRating value={rating.stars} elite={rating.stars === 5} />
      <span className="chip-rank">{ordinal(rating.rank)}</span>
    </div>
  );
}
