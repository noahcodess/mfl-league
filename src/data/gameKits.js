// What both teams wear in a game (the home team in the darker uniform) and the players a broadcast shows off.
import { useJerseys, gameUniforms } from './jerseys.js';
import { getPlayers } from './players.js';

export function useGameKits(home, away) {
  const hj = useJerseys(home), aj = useJerseys(away);
  if (!hj?.length || !aj?.length) return null;
  return gameUniforms(hj, aj, null);
}

// A team's three headliners for graphics: its QB, its best playmaker and its best defender.
export function headliners(teamId) {
  const ps = getPlayers(teamId).filter((p) => p.status !== 'retired').sort((a, b) => (b.depth === 'starter') - (a.depth === 'starter') || b.stars - a.stars);
  const qb = ps.find((p) => p.position === 'QB'), skill = ps.find((p) => ['RB', 'WR', 'TE'].includes(p.position));
  const def = ps.find((p) => ['DE', 'DL', 'DT', 'LB', 'CB', 'SS', 'FS'].includes(p.position));
  return [skill, qb, def].filter(Boolean);
}
