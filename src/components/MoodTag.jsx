import React from 'react';
import { MOOD_NAMES, moodImg } from '../data/morale.js';

// A player's mood as its pixel emoji, with the word next to it unless iconOnly.
export default function MoodTag({ mood, size = 20, iconOnly }) {
  if (!mood) return <span className="mood none">-</span>;
  return (
    <span className={`mood mood-${mood}`} title={MOOD_NAMES[mood]}>
      <img src={moodImg(mood)} alt={MOOD_NAMES[mood]} width={size} height={size} />
      {!iconOnly && <span>{MOOD_NAMES[mood] || mood}</span>}
    </span>
  );
}
