// The season the Live tab and League leaders show. Until the game engine exists this is the sample season (made from the real
// rosters); once real games are scheduled their matchups, TV windows, times and scores are used. Replace here when games are built.
import { useEffect, useMemo, useState } from 'react';
import { sampleSeason } from '../lib/sampleSeason.js';
import { useSeasonGames, rivalPairs } from './games.js';
import { getTeams, currentSeason, currentWeek, currentPhase } from './teams.js';
import { getPlayers } from './players.js';
import { ROUNDS } from '../lib/playoffRounds.js';
import { DEMO_PLAY } from './playoffDemo.js';

let sample = null;
export function getSampleSeason() {
  if (!sample) sample = sampleSeason(getTeams(), getPlayers);
  return sample;
}

const timeText = (iso) => new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(',', '');

// The week the league is on: the saved week (it moves when the commissioner goes to the next week, or when a game from a
// later week is played or simmed). A finished week stays "this week" until then, so going to the next week from Week 1
// lands on Week 2, never 3.
export function weekNow(games) {
  const played = (games || []).filter((g) => g.kind === 'regular' && g.status === 'final').map((g) => g.week);
  return Math.min(12, Math.max(1, currentWeek() || 1, ...played));   // the league's week (a game played from a later week has moved it there)
}

const card = (g) => ({
  id: g.id, week: g.week, kind: g.kind, home: g.home, away: g.away, window: g.prime, time: g.starts_at ? timeText(g.starts_at) : 'Time to be set',
  status: g.status === 'final' ? 'final' : 'upcoming', homeScore: g.home_score, awayScore: g.away_score, lines: [], rivalry: !!g.rivalry, startsAt: g.starts_at || null,
});

// weeks: the 12 regular-season weeks (records and standings only ever count these). playoffs: each round once it's set.
function fromGames(games) {
  const weeks = Array.from({ length: 12 }, (_, i) => ({ week: i + 1, games: [] }));
  games.filter((g) => g.kind === 'regular' && g.week >= 1 && g.week <= 12).forEach((g) => weeks[g.week - 1].games.push(card(g)));
  const playoffs = ROUNDS.map((r) => ({ ...r, games: games.filter((g) => g.kind === r.kind).map(card) })).filter((r) => r.games.length);
  return { sample: false, current: weekNow(games), weeks, playoffs };
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
    for (const s of seasons.filter(Boolean)) for (const w of [...s.weeks, ...(s.playoffs || [])]) { const g = w.games.find((x) => String(x.id) === String(id)); if (g) return { game: g, season: s }; }
    return null;
  }, [games, id]);
}

// preview: show the sample season even outside the regular season (owner and commissioner).
export function useLiveSeason(preview = false) {
  const games = useSeasonGames(currentSeason());
  return useMemo(() => {
    const real = (currentPhase() === 'regular_season' || DEMO_PLAY) && games?.some((g) => g.kind === 'regular');   // (dev: the playoff preview)
    if (real && !preview) return fromGames(games);
    return getSampleSeason();
  }, [games, preview]);
}
