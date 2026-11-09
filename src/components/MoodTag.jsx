import React from 'react';

// Player mood from the roster posts (happy, normal, excited, angry, unhappy).
const LABELS = { happy: 'Happy', normal: 'Normal', excited: 'Excited', angry: 'Angry', unhappy: 'Unhappy' };

export default function MoodTag({ mood }) {
  if (!mood) return <span className="mood none">-</span>;
  return <span className={`mood mood-${mood}`}>{LABELS[mood] || mood}</span>;
}
