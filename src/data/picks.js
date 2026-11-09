import league from './league.json';

// Loads the draft picks a team owns, oldest season first.
export function getPicks(teamId) {
  return league.picks
    .filter((p) => p.ownerId === teamId)
    .sort((a, b) => a.season - b.season || a.round - b.round);
}
