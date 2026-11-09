// Holds the league data every screen reads: the bundled import at first, swapped for the live database copy once loaded.
import bundled from './league.json';
import bundledIssues from './importIssues.json';

export const store = {
  league: bundled,
  issues: bundledIssues,
  source: 'bundled',
};
