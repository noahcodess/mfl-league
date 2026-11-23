// The crowd for one game, decided once before kickoff and the same everywhere (the intro's attendance, the live game and a
// quick sim): the home team's fan support going into the game plus the occasion. It feeds the Stadium Pulse in the engine.
// Returns { fill (0-1), count, soldOut, capacity, capRank (1 = biggest stadium), fan, oppFan, rivalry, color (fans dressed for an alternate), prime }.
import { useEffect, useState } from 'react';
import { currentSeason, getTeam } from './teams.js';
import { seasonGamesNow } from './games.js';
import { craftBowlsNow } from './craftBowls.js';
import { stadiumsNow } from './stadiums.js';
import { specialtyNow } from './jerseys.js';
import { isRivalGame } from './gameResults.js';
import { broadcastFor } from './broadcast.js';
import { fanShared, fanAt } from './fanSupport.js';
import { gameAttendance } from '../lib/attendance.js';

const memo = new Map();
export function loadCrowd(game) {
  if (!game?.id) return Promise.resolve(null);
  if (!memo.has(game.id)) memo.set(game.id, (async () => {
    const season = game.season ?? currentSeason();
    const [data, games, bowls, stadiums, rivalry, pick] = await Promise.all([fanShared(), seasonGamesNow(season), craftBowlsNow(), stadiumsNow(), isRivalGame(game.home, game.away), specialtyNow(game.id, season)]);
    const ctx = { data, games, bowls, season }, fan = fanAt(ctx, game.home, game.week)?.value ?? 50, oppFan = fanAt(ctx, game.away, game.week)?.value ?? 50;
    const capacity = stadiums?.[game.home]?.capacity || 60000, prime = broadcastFor({ window: game.window ?? game.prime ?? null }, getTeam(game.home)).prime, color = !!(pick.slot && pick.fans);
    const att = gameAttendance({ fan, oppFan, capacity, rivalry: rivalry || !!game.rivalry, special: color, alternate: !!pick.slot, prime, playoff: game.kind === 'playoff' || game.week > 12, final: game.kind === 'craft_bowl', gameId: game.id });
    const capRank = 1 + Object.values(stadiums || {}).filter((x) => (x?.capacity || 0) > capacity).length;   // 1 = the biggest stadium in the league
    return { fill: att.pct, count: att.count, soldOut: att.soldOut, pct: att.pct, capacity, capRank, fan, oppFan, rivalry: rivalry || !!game.rivalry, color, prime };
  })().catch(() => { memo.delete(game.id); return null; }));
  return memo.get(game.id);
}

// The same for a screen: null while it loads.
export function useGameCrowd(game) {
  const [crowd, setCrowd] = useState(null);
  useEffect(() => { let live = true; loadCrowd(game).then((c) => live && setCrowd(c)); return () => { live = false; }; }, [game?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return crowd;
}
