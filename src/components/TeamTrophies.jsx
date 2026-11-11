import React from 'react';
import TrophyCase from './TrophyCase.jsx';
import { useCraftBowls, teamTitles } from '../data/craftBowls.js';

// A team's Craft Bowl trophies under its name (nothing if it has never won one).
export default function TeamTrophies({ teamId, size }) {
  const bowls = useCraftBowls();
  return <TrophyCase titles={teamTitles(bowls, teamId)} size={size} />;
}
