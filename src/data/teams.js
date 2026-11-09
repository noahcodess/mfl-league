import league from './league.json';
import styles from './teamStyles.json';

// Loads teams with their display colors. Later this reads from the database.
const withStyle = (t) => ({ ...t, ...(styles[t.code] || { color: '#5b6478', accent: '#ffffff' }) });

export function getTeams() {
  return league.teams.map(withStyle).sort((a, b) => (a.overall?.rank ?? 99) - (b.overall?.rank ?? 99));
}

export function getTeam(id) {
  const t = league.teams.find((x) => x.id === id);
  return t ? withStyle(t) : null;
}

export function getTeamByCode(code) {
  const t = league.teams.find((x) => x.code === code);
  return t ? withStyle(t) : null;
}

export function capLimit() {
  return league.meta.capLimit;
}

export function currentSeason() {
  return league.meta.currentSeason;
}
