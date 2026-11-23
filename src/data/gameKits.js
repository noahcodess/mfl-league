// What both teams wear in a game (the home team in the darker uniform, or its specialty pick), what color the fans wear if
// the home team dressed them to match, and the players a broadcast shows off.
import { useJerseys, useGamePicks, gameUniforms, fansDressed } from './jerseys.js';
import { getPlayers } from './players.js';
import { currentSeason } from './teams.js';

// Returns { home, away, special, fans }. fans: the color every fan wears (the alternate's jersey color), or null.
export function useGameKits(home, away, game) {
  const hj = useJerseys(home), aj = useJerseys(away), picks = useGamePicks(game?.season ?? currentSeason());
  if (!hj?.length || !aj?.length) return null;
  const devWo = import.meta.env.DEV && home?.id === 'snm' && /[?&]demowo/.test(window.location.search) ? 3 : null;   // dev only: a whiteout game to test with
  const kits = gameUniforms(hj, aj, devWo || (game ? picks.get(game.id) : null));
  return { ...kits, fans: kits.special && fansDressed(game.id) ? kits.home.colors.jersey : null };
}

// A team's three headliners for graphics: its QB, its best playmaker and its best defender.
export function headliners(teamId) {
  const ps = getPlayers(teamId).filter((p) => p.status !== 'retired').sort((a, b) => (b.depth === 'starter') - (a.depth === 'starter') || b.stars - a.stars);
  const qb = ps.find((p) => p.position === 'QB'), skill = ps.find((p) => ['RB', 'WR', 'TE'].includes(p.position));
  const def = ps.find((p) => ['DE', 'DL', 'DT', 'LB', 'CB', 'SS', 'FS'].includes(p.position));
  return [skill, qb, def].filter(Boolean);
}
