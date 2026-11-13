// The season the Live tab and League leaders show. Until the game engine exists this is the sample season (made from the real
// rosters); once real games are scheduled their matchups, TV windows, times and scores are used. Replace here when games are built.
import { useMemo } from 'react';
import { sampleSeason } from '../lib/sampleSeason.js';
import { useSeasonGames } from './games.js';
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
    status: g.status === 'final' ? 'final' : 'upcoming', homeScore: g.home_score, awayScore: g.away_score, lines: [],
  }));
  return { sample: false, current: Math.min(12, Math.max(1, currentWeek() || 1)), weeks };
}

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
