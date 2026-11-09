import issues from './importIssues.json';

// Loads the problems found when the Discord rosters were imported.
export function getIssues() {
  return issues;
}

export function getTeamIssues(teamId) {
  return issues.filter((i) => i.teamId === teamId);
}
