import { store } from './store.js';

// Loads players and works out contract numbers. Reads from the store (live database copy when loaded).
export function getPlayers(teamId) {
  return store.league.players.filter((p) => p.teamId === teamId);
}

export function getAllPlayers() {
  return store.league.players;
}

// Cap hit = total contract value spread evenly over its years (to be confirmed by the league).
export function capHit(p) {
  const c = p.contract;
  return c && c.years ? c.total / c.years : 0;
}

export function teamCapUsed(teamId) {
  return getPlayers(teamId).reduce((sum, p) => sum + capHit(p), 0);
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
