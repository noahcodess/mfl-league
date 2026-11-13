// Making a season's schedule: the 96 regular season games (scheduleGen.js rules), then the best matchup of each week to Sunday
// night, the next to Monday, Thursday and Saturday night, the rest to day games. Used by the Schedule tab and the test sim.
import { db } from './supabase.js';
import { lastWinPct, rivalPairs, saveSchedule, setWeekWindows, PRIME_PLAN } from './games.js';
import { getTeams } from './teams.js';
import { makeSchedule, checkSchedule } from '../lib/scheduleGen.js';

const RANK = { great: 0, good: 1, okay: 2, blowout: 3, bad: 4 };

export async function generateSeasonSchedule(season) {
  const teams = getTeams();
  const g = makeSchedule(teams, await lastWinPct(), Math.random, await rivalPairs());
  const problems = checkSchedule(g, teams);
  if (problems.length) throw new Error(problems[0]);
  await saveSchedule(season, g);
}

// games: the season's regular games with odds (from season_games). Reads them if not given.
export async function bestGamesToPrimetime(season, games) {
  const list = games || ((await db.rpc('season_games', { p_season: season })).data || []).filter((g) => g.kind === 'regular');
  for (let w = 1; w <= 12; w += 1) {
    const wk = list.filter((g) => g.week === w).sort((a, b) => (RANK[a.odds?.rating] - (a.rivalry ? 1.5 : 0)) - (RANK[b.odds?.rating] - (b.rivalry ? 1.5 : 0))
      || Math.abs((a.odds?.home_win ?? 0.5) - 0.5) - Math.abs((b.odds?.home_win ?? 0.5) - 0.5));
    if (wk.length) await setWeekWindows(season, w, wk.map((g) => g.id), wk.map((_, i) => PRIME_PLAN[i] || 'sun_day'));
  }
}
