// Everything the League feed needs in one load: last season's results (standings + records), the top players,
// recent trades (player moves), and who's on the trade block.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { getAllPlayers } from './players.js';
import { getTeams } from './teams.js';

const demo = () => {
  const players = getAllPlayers().filter((p) => p.teamId).sort((a, b) => b.stars - a.stars);
  return {
    season: 7,
    results: getTeams().map((t, i) => ({ teamId: t.id, wins: 12 - (i % 9), losses: 2 + (i % 9), pf: 320 - i * 9, pa: 180 + i * 7, playoff: i === 0 ? 'champion' : i === 1 ? 'craft_bowl_loss' : i < 6 ? 'divisional' : 'missed' })),
    top: players.slice(0, 10).map((p, i) => ({ ...p, rank: i + 1 })),
    moves: players.slice(10, 16).map((p, i) => ({ id: i, player: p, from: 'wrf', to: p.teamId, at: new Date(Date.now() - i * 864e5 * 9).toISOString(), season: 7, note: 'Traded for a Season 9 2nd-round pick' })),
    block: players.slice(20, 26),
  };
};

export function useLeagueNews(version = 0) {
  const [news, setNews] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO) { setNews(demo()); return undefined; }
    (async () => {
      const latest = await db.from('team_seasons').select('season').order('season', { ascending: false }).limit(1).maybeSingle();
      const season = latest.data?.season ?? null;
      const [res, ranks, moves, block] = await Promise.all([
        season ? db.from('team_seasons').select('*').eq('season', season) : Promise.resolve({ data: [] }),
        db.from('player_ranks').select('player_id, overall_rank').order('overall_rank').limit(10),
        db.from('player_moves').select('*').order('happened_at', { ascending: false }).limit(8),
        db.from('trade_block').select('player_id, team_id, added_at').order('added_at', { ascending: false }),
      ]);
      const byId = Object.fromEntries(getAllPlayers().map((p) => [p.id, p]));
      if (!live) return;
      setNews({
        season,
        results: (res.data || []).map((r) => ({ teamId: r.team_id, wins: r.wins, losses: r.losses, pf: r.points_for, pa: r.points_against, playoff: r.playoff })),
        top: (ranks.data || []).filter((r) => byId[r.player_id]).map((r) => ({ ...byId[r.player_id], rank: r.overall_rank })),
        moves: (moves.data || []).filter((m) => byId[m.player_id]).map((m) => ({ id: m.id, player: byId[m.player_id], from: m.from_team, to: m.to_team, at: m.happened_at, season: m.season, note: m.note })),
        block: (block.data || []).map((b) => byId[b.player_id]).filter(Boolean),
      });
    })();
    return () => { live = false; };
  }, [version]);
  return news;
}
