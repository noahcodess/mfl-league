// The two teams as a broadcast shows them: in the playoffs each carries its seed (the scorebugs show it next to the
// abbreviation), and in the Craft Bowl each wears its gold logo (its normal logo if it has none).
import { useMemo } from 'react';
import { getTeam, getTeams } from './teams.js';
import { goldLogoFor, useGoldLogos } from './goldLogos.js';
import { records } from '../lib/seasonStats.js';
import { playoffSeeds } from '../lib/playoffSeeds.js';
import { isPlayoffGame } from '../lib/playoffRounds.js';

export function broadcastTeams(game, season) {
  const playoff = isPlayoffGame(game), gold = game?.kind === 'craft_bowl';
  const seeds = playoff && season?.weeks ? Object.fromEntries(Object.values(playoffSeeds(getTeams(), records(season.weeks))).flat().map((s) => [s.id, s.seed])) : {};
  const dress = (id) => { const t = getTeam(id); return { ...t, logo: (gold && goldLogoFor(t)) || t.logo, seed: seeds[id] || null }; };
  return { home: dress(game.home), away: dress(game.away) };
}

export function useBroadcastTeams(game, season) {
  useGoldLogos();
  return useMemo(() => broadcastTeams(game, season), [game?.id, game?.kind, season]); // eslint-disable-line react-hooks/exhaustive-deps
}
