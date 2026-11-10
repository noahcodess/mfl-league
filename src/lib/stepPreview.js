// Plain-English preview of what the next offseason step will do, worked out from the current league data.
import { getAllPlayers, getFreeAgents, isRetiring, maxAge } from '../data/players.js';
import { faRound, faRounds } from '../data/freeAgency.js';
import { isExpiring } from '../data/contracts.js';
import { plural } from './format.js';

export function previewStep(step) {
  const players = getAllPlayers();
  const onTeams = players.filter((p) => p.teamId);
  switch (step) {
    case 0: {
      const n = players.filter((p) => p.age != null && p.age < 60).length;
      const list = players.filter(isRetiring);
      return { text: `${plural(n, 'player')} turn a year older, then ${plural(list.length, 'player')} past the max age of ${maxAge()} retire and leave their teams.`, list };
    }
    case 1: {
      const list = onTeams.filter(isExpiring);
      return { text: `${plural(list.length, 'contract')} end. The re-signing window opens: teams can re-sign their own players.`, list };
    }
    case 2: {
      const list = onTeams.filter(isExpiring);
      return { text: `The re-signing window closes and free agency opens. Bot teams re-sign who they want to keep, anyone still unsigned (up to ${list.length}) joins the ${getFreeAgents().length} free agents already out there, and new street free agents fill the pool if it's thin. Deals waiting for approval must be handled first.`, list };
    }
    case 3: return { text: `Free agency closes: bot teams fill any empty roster spots with leftover free agents and unanswered offers expire. Run your free agency rounds first (${faRound()} of ${faRounds()} done). The draft room isn't built yet, so the draft itself is skipped for now.`, list: [] };
    case 4: return { text: 'Training camp ends and the regular season begins.', list: [] };
    default: return { text: '', list: [] };
  }
}
