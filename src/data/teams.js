import { store } from './store.js';
import styles from './teamStyles.json';
import { logoFor } from './logos.js';

// Loads teams with their display colors. Reads from the store (live database copy when loaded).
const withStyle = (t) => ({ ...(styles[t.code] || { color: '#5b6478', accent: '#ffffff' }), ...t, color: t.color || styles[t.code]?.color || '#5b6478', accent: t.accent || styles[t.code]?.accent || '#ffffff', logo: logoFor(t.id) });

export function getTeams() {
  return store.league.teams.map(withStyle).sort((a, b) => (a.overall?.rank ?? 99) - (b.overall?.rank ?? 99));
}

export function getConferences() {
  return ['Overworld', 'Nether'];
}

export function getTeam(id) {
  const t = store.league.teams.find((x) => x.id === id);
  return t ? withStyle(t) : null;
}

export function getTeamByCode(code) {
  const t = store.league.teams.find((x) => x.code === code);
  return t ? withStyle(t) : null;
}

export function capLimit() {
  return store.league.meta.capLimit;
}

export function currentSeason() {
  return store.league.meta.currentSeason;
}

// League calendar phase: 'offseason', 'regular_season' or 'playoffs'.
export function currentPhase() {
  return store.league.meta.phase || 'offseason';
}

export const PHASE_NAMES = { offseason: 'Offseason', regular_season: 'Regular Season', playoffs: 'Playoffs' };

// Which offseason step is up next (0 = Birthday & Farewell ... 4 = Training camp).
export function offseasonStep() {
  return store.league.meta.offseasonStep ?? 0;
}

// The step number is the NEXT step to run, so a window is open right after its step runs.
export const RESIGN_WINDOW = 2; // after Re-signing runs
export const FA_WINDOW = 3; // after Free agency runs
export const resignOpen = () => currentPhase() === 'offseason' && offseasonStep() === RESIGN_WINDOW;

export function leagueEvents() {
  return store.events || [];
}
