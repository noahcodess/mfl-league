import { store } from './store.js';
import { currentSeason, currentPhase, offseasonStep } from './teams.js';

// The next draft: this season's until it's held in the offseason, then next season's.
export const nextDraftSeason = () => (currentPhase() === 'offseason' && offseasonStep() <= 3 ? currentSeason() : currentSeason() + 1);

// Loads the draft picks a team owns, oldest season first. Spent picks (drafts already held) drop off; every team gets a
// new 1st, 2nd and 3rd each season.
export function getPicks(teamId) {
  const from = nextDraftSeason();
  return store.league.picks
    .filter((p) => p.ownerId === teamId && p.season >= from)
    .sort((a, b) => a.season - b.season || a.round - b.round);
}
