// What a player is worth per year on the open market, and what he'd ask for. Built from the league's real
// salaries (median pay by star rating, smoothed so better players always cost more), then adjusted for
// position, age, role, potential and personality.
import { traitsFor } from './playerTraits.js';

const BASE = { 1: 28000, 1.5: 38000, 2: 47000, 2.5: 61000, 3: 80000, 3.5: 93000, 4: 117000, 4.5: 150000, 5: 198000 };
const POSITION = { QB: 1.25, WR: 1.1, DE: 1.1, OT: 1.1, TE: 0.9, OG: 0.9, C: 0.9, DT: 0.9, SS: 0.9 };
const AGE = { 21: 0.9, 22: 0.9, 26: 0.95, 27: 0.85 };
export const MIN_SALARY = 10000;
export const MAX_CONTRACT_TOTAL = 1000000;

const round5k = (n) => Math.max(MIN_SALARY, Math.round(n / 5000) * 5000);

// Fair yearly value anyone can see: stars, elite status, position, age and starter/backup role.
export function marketValue(p) {
  if (p.stars == null) return null;
  const base = BASE[p.stars] ?? BASE[Math.round(p.stars * 2) / 2] ?? 47000;
  return round5k(base * (p.elite ? 1.15 : 1) * (POSITION[p.position] ?? 1) * (AGE[p.age] ?? 1) * (p.depth === 'backup' ? 0.85 : 1));
}

// What the player himself asks for: market value, plus a bump if he knows he's still growing, times his greed.
// Mood matters too: unhappy players want more to stay, happy ones give a discount.
export function askingPrice(p, potential, traits) {
  const value = marketValue(p);
  if (value == null) return null;
  const t = traits || traitsFor(p);
  const growth = potential != null && p.age != null && p.age <= 24 ? 1 + 0.15 * Math.max(0, potential - p.stars) : 1;
  const mood = { angry: 1.12, unhappy: 1.08, happy: 0.95, excited: 0.92 }[p.mood] ?? 1;
  return Math.min(MAX_CONTRACT_TOTAL, round5k(value * growth * t.greed * mood));
}

// Longest deal he can sign (seasons through the max age) and how many years he'd like.
export const maxYears = (p, maxAge = 27) => Math.max(1, Math.min(3, maxAge - (p.age ?? 25) + 1));

export function preferredYears(p, potential, maxAge = 27) {
  if (p.age == null) return 2;
  const left = maxYears(p, maxAge);
  const rising = potential != null && potential > p.stars;
  const want = p.age <= 23 && rising ? 2 : p.age <= 25 ? 3 : 1;
  return Math.min(3, want, left);
}
