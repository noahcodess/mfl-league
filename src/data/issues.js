import { store } from './store.js';

// Loads the problems found when the Discord rosters were imported.
export function getIssues() {
  return store.issues;
}

export function getTeamIssues(teamId) {
  return store.issues.filter((i) => i.teamId === teamId);
}
