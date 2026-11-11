// What a coach can wear (6 shirts, 6 pants, a color palette, sunglasses) and how a coach looks by default.
// The face is generated like a player's (seeded by team) unless the commissioner set it; the outfit starts in team colors.
import { looksFor } from './portraitLooks.js';
import { seeded } from './seed.js';

export const SHIRTS = [['hoodie', 'Hoodie'], ['tee', 'T-shirt'], ['polo', 'Polo'], ['quarterzip', 'Quarter-zip'], ['suit', 'Suit jacket'], ['jacket', 'Windbreaker']];
export const PANTS = [['sweats', 'Sweatpants'], ['jeans', 'Jeans'], ['khakis', 'Khakis'], ['slacks', 'Dress slacks'], ['shorts', 'Shorts'], ['cargo', 'Cargo pants']];
export const GLASSES = [['none', 'None'], ['sun', 'Sunglasses'], ['clear', 'Glasses']];
export const OUTFIT_COLORS = ['#1b1b1f', '#f2f2f2', '#7d838c', '#1f2f5c', '#2f6fd6', '#7fc4f0', '#b3261e', '#e8742a', '#f1c232', '#2e7d32', '#6a3fb5', '#c2185b',
  '#5d4037', '#c8b48a', '#3a4a2a', '#0f4c5c'];

export function coachLooks(coach, team) {
  const face = looksFor({ id: `coach-${coach.team_id || coach.teamId}`, nationality: 'USA' });
  const r = seeded(`coach-outfit-${coach.team_id || coach.teamId}`);
  const outfit = {
    shirt: SHIRTS[r(SHIRTS.length)][0], shirtColor: team?.color || '#1f2f5c',
    pants: ['khakis', 'slacks', 'sweats', 'jeans'][r(4)], pantsColor: ['#c8b48a', '#1b1b1f', '#7d838c', '#1f2f5c'][r(4)],
    glasses: r(5) === 0 ? 'sun' : r(6) === 0 ? 'clear' : 'none',
  };
  return { ...face, chain: false, headband: false, eyeBlack: false, ...outfit, ...(coach.looks || {}) };
}
