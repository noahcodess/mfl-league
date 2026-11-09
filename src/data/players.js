import league from './league.json';

// Loads players and works out contract numbers. Later this reads from the database.
export function getPlayers(teamId) {
  return league.players.filter((p) => p.teamId === teamId);
}

export function getAllPlayers() {
  return league.players;
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
  return league.vacancies.filter((v) => v.teamId === teamId);
}
