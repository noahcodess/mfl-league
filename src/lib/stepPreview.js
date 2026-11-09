// Plain-English preview of what the next offseason step will do, worked out from the current league data.
import { getAllPlayers, isRetiring, maxAge } from '../data/players.js';
import { isExpiring } from '../data/contracts.js';
import { plural } from './format.js';

export function previewStep(step) {
  const players = getAllPlayers();
  const onTeams = players.filter((p) => p.teamId);
  switch (step) {
    case 0: {
      const n = players.filter((p) => p.age != null && p.age < 60).length;
      return { text: `${plural(n, 'player')} turn a year older.`, list: [] };
    }
    case 1: {
      const list = players.filter(isRetiring);
      return { text: `${plural(list.length, 'player')} past the max age of ${maxAge()} retire and leave their teams.`, list };
    }
    case 2: {
      const list = onTeams.filter(isExpiring);
      return { text: `${plural(list.length, 'contract')} end. The re-signing window opens: teams can re-sign their own players.`, list };
    }
    case 3: {
      const list = onTeams.filter(isExpiring);
      return { text: `The re-signing window closes. ${plural(list.length, 'unsigned player')} become free agents.`, list };
    }
    case 4: return { text: 'The draft room isn\'t built yet, so this step is skipped for now.', list: [] };
    case 5: return { text: 'Training camp ends and the regular season begins.', list: [] };
    default: return { text: '', list: [] };
  }
}
