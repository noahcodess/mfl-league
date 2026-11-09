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
