import React from 'react';
import { coachLooks } from '../lib/coachLooks.js';
import { coachUrl } from '../lib/coachDraw.js';

// A coach's full-body pixel sprite. Pass `looks` to preview an outfit before saving it; each change pops in.
export default function CoachSprite({ coach, team, looks, height = 112, bob }) {
  const src = coachUrl({ ...coachLooks(coach, team), ...(looks || {}) });
  return <img key={src} className={`coach-sprite${bob ? ' bob' : ''}`} src={src} width={Math.round(height * 32 / 56)} height={height} alt={coach.name} draggable="false" />;
}
