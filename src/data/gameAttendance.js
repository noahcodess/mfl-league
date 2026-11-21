// The crowd for one game: the home team's fan support going into it plus the occasion (rivalry, special event, primetime,
// playoffs) → { count, pct, soldOut, why }, or null while fan support loads.
import { useMemo } from 'react';
import { useFanSupport } from './fanSupport.js';
import { gameAttendance } from '../lib/attendance.js';

export function useGameAttendance(game, kits, bc, stadium) {
  const fans = useFanSupport();
  return useMemo(() => {
    if (!fans.ready || !game) return null;
    const home = fans.at(game.home, game.week), away = fans.at(game.away, game.week);
    return { ...gameAttendance({ fan: home?.value, oppFan: away?.value, capacity: stadium?.capacity, rivalry: !!game.rivalry, special: !!kits?.fans, alternate: !!kits?.special,
      prime: !!bc?.prime, playoff: game.kind === 'playoff' || game.week > 12, final: game.kind === 'craft_bowl', gameId: game.id }), fan: home?.value };
  }, [fans, game, kits, bc, stadium]);
}
