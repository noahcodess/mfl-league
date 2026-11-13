// The season the Live tab and League leaders show. Until the game engine exists this is the sample season (made from the real
// rosters); once real games are scheduled their matchups, TV windows, times and scores are used. Replace here when games are built.
import { useEffect, useMemo, useState } from 'react';
import { sampleSeason } from '../lib/sampleSeason.js';
import { useSeasonGames, rivalPairs } from './games.js';
import { getTeams, currentSeason, currentWeek, currentPhase } from './teams.js';
import { getPlayers } from './players.js';

let sample = null;
export function getSampleSeason() {
  if (!sample) sample = sampleSeason(getTeams(), getPlayers);
  return sample;
}

const timeText = (iso) => new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(',', '');

function fromGames(games) {
  const weeks = Array.from({ length: 12 }, (_, i) => ({ week: i + 1, games: [] }));
  games.filter((g) => g.kind === 'regular' && g.week >= 1 && g.week <= 12).forEach((g) => weeks[g.week - 1].games.push({
    id: g.id, week: g.week, home: g.home, away: g.away, window: g.prime, time: g.starts_at ? timeText(g.starts_at) : 'Time to be set',
    status: g.status === 'final' ? 'final' : 'upcoming', homeScore: g.home_score, awayScore: g.away_score, lines: [], rivalry: !!g.rivalry, startsAt: g.starts_at || null,
  }));
  return { sample: false, current: Math.min(12, Math.max(1, currentWeek() || 1)), weeks };
}

// Every rivalry as a set of 'a|b' keys (both orders), for the ⚔️ Rivalry badge.
let rivalCache = null;
export function useRivals() {
  const [set, setSet] = useState(rivalCache || new Set());
  useEffect(() => {
    if (rivalCache) return undefined;
    let live = true;
    rivalPairs().then((pairs) => { rivalCache = new Set(pairs.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`])); if (live) setSet(rivalCache); });
    return () => { live = false; };
  }, []);
  return set;
}
export const isRivalry = (g, rivals) => !!g.rivalry || rivals.has(`${g.home}|${g.away}`);

// One game by id, from the real schedule or the sample season: { game, season } or null.
export function useGame(id) {
  const games = useSeasonGames(currentSeason());
  return useMemo(() => {
    const seasons = [games?.some((g) => g.kind === 'regular') ? fromGames(games) : null, getSampleSeason()];
    for (const s of seasons.filter(Boolean)) for (const w of s.weeks) { const g = w.games.find((x) => String(x.id) === String(id)); if (g) return { game: g, season: s }; }
    return null;
  }, [games, id]);
}

// preview: show the sample season even outside the regular season (owner and commissioner).
export function useLiveSeason(preview = false) {
  const games = useSeasonGames(currentSeason());
  return useMemo(() => {
    const real = currentPhase() === 'regular_season' && games?.some((g) => g.kind === 'regular');
    if (real && !preview) return fromGames(games);
    return getSampleSeason();
  }, [games, preview]);
}
