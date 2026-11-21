// Loads what fan support is built from (past seasons, this season's results, Craft Bowls, who coaches each team and since
// when) and runs the calculator for every team. at(teamId, beforeWeek) gives a team's fan support going into a game.
import { useEffect, useMemo, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { getTeams, currentSeason } from './teams.js';
import { useSeasonGames } from './games.js';
import { useCraftBowls, teamTitles } from './craftBowls.js';
import { fanSupport, MEMORY } from '../lib/fanSupport.js';

let shared = null;
async function loadShared() {
  if (DEMO) return { seasons: demoSeasons(), tenures: [] };
  const [s, t] = await Promise.all([
    db.from('team_seasons').select('team_id, season, wins, losses, points_for, points_against, playoff'),
    db.from('coach_tenures').select('team_id, human, season, week').is('ended_at', null),   // missing until its migration runs: no hope bumps yet
  ]);
  return { seasons: s.data || [], tenures: t.error ? [] : t.data || [] };
}
const demoSeasons = () => getTeams().map((t) => { const w = Math.round(Math.max(0, Math.min(12, ((t.overall?.stars ?? 3.5) - 2.5) / 2.5 * 12)));
  return { team_id: t.id, season: currentSeason() - 1, wins: w, losses: 12 - w, points_for: 240 + (w - 6) * 9, points_against: 240 - (w - 6) * 9, playoff: w >= 10 ? 'conference' : w >= 8 ? 'divisional' : 'missed' }; });

// This season for one team from the finished games before `beforeWeek` (all of them when null): record, points, streak.
function seasonSoFar(teamId, games, beforeWeek, row) {
  const done = (games || []).filter((g) => (g.home === teamId || g.away === teamId) && g.status === 'final' && g.home_score != null && (beforeWeek == null || g.week < beforeWeek))
    .sort((a, b) => a.week - b.week);
  const now = { w: 0, l: 0, pf: 0, pa: 0, streak: 0, playoff: beforeWeek == null && row?.playoff !== 'missed' ? row?.playoff : 'missed' };
  done.forEach((g) => { const us = g.home === teamId ? g.home_score : g.away_score, them = g.home === teamId ? g.away_score : g.home_score, won = us > them;
    now.pf += us; now.pa += them; if (won) now.w += 1; else now.l += 1; now.streak = won ? Math.max(1, now.streak + 1) : Math.min(-1, now.streak - 1); });
  return { now, played: done };
}

export function useFanSupport() {
  const season = currentSeason(), games = useSeasonGames(season), bowls = useCraftBowls();
  const [data, setData] = useState(shared);
  useEffect(() => { if (!shared) loadShared().then((d) => { shared = d; setData(d); }); }, []);
  return useMemo(() => {
    const at = (teamId, beforeWeek = null) => {
      const team = getTeams().find((t) => t.id === teamId); if (!team || !data) return null;
      const rows = data.seasons.filter((r) => r.team_id === teamId);
      const history = rows.filter((r) => r.season < season).sort((a, b) => b.season - a.season).slice(0, MEMORY)
        .map((r) => ({ w: r.wins, l: r.losses, pf: r.points_for, pa: r.points_against, playoff: r.playoff }));
      const { now, played } = seasonSoFar(teamId, games, beforeWeek, rows.find((r) => r.season === season));
      const ten = data.tenures.find((t) => t.team_id === teamId);
      const newCoach = ten?.human && ten.season === season ? { human: true, games: played.filter((g) => g.week >= (ten.week || 0)).length } : null;
      return { ...fanSupport({ history, now, stars: team.overall?.stars, titles: teamTitles(bowls, teamId).length, newCoach }), record: `${now.w}-${now.l}`, newCoach: !!newCoach };
    };
    const map = data ? Object.fromEntries(getTeams().map((t) => [t.id, at(t.id)])) : null;
    return { ready: !!data, map, at };
  }, [data, games, bowls, season]);
}
