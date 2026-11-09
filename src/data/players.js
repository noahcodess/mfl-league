import { store } from './store.js';
import { contractOf, capHitOf } from './contracts.js';

// Loads players and works out contract numbers. Reads from the store (live database copy when loaded).
export function getPlayers(teamId) {
  return store.league.players.filter((p) => p.teamId === teamId);
}

// Everyone still playing (on a team or a free agent). Retired players stay in the data for history.
export function getAllPlayers() {
  return store.league.players.filter((p) => (p.status ?? 'active') !== 'retired');
}

export function getFreeAgents() {
  return store.league.players.filter((p) => p.status === 'free_agent');
}

// Cap hit = the contract's yearly amount (total ÷ years). Used for display; the cap total only counts live deals.
export function capHit(p) {
  return contractOf(p)?.perYear ?? 0;
}

export function teamCapUsed(teamId) {
  return getPlayers(teamId).reduce((sum, p) => sum + capHitOf(p), 0);
}

export function getVacancies(teamId) {
  return store.league.vacancies.filter((v) => v.teamId === teamId);
}

// Oldest age a player can play. Anyone older retires when the commissioner runs the retirement step.
export function maxAge() {
  return store.league.meta.maxAge ?? 27;
}

// Age a player will be once this offseason's aging step runs (the commissioner starts it). Ages over 60 are typos.
export function offseasonAge(p) {
  if (p.age == null || p.age >= 60) return null;
  const aged = (store.league.meta.agedForSeason ?? 0) >= store.league.meta.currentSeason;
  return aged ? p.age : p.age + 1;
}

// Retiring = past the max age after this offseason's birthday.
export function isRetiring(p) {
  const age = offseasonAge(p);
  return age != null && age > maxAge();
}
