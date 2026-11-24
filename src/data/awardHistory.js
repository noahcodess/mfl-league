// Each player's earlier seasons, for Comeback Player of the Year (lib/comeback.js): the seasons he played on the site
// (games, team games, impact against a normal starter), the weeks he missed hurt last season, and his contract's role
// (starter or backup) each season he was signed, which also covers the seasons before the site.
import { db } from './supabase.js';
import { getAllPlayers } from './players.js';
import { seasonValues } from '../lib/awardMath.js';
import { impact } from '../lib/awardRank.js';

const all = async (q) => { const out = []; for (let from = 0; ; from += 1000) { const { data, error } = await q().range(from, from + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out; } };

// season: the season being ranked. Returns { [playerId]: history }.
export async function comebackHistory(season) {
  const back = [season - 1, season - 2, season - 3, season - 4];
  const [stats, hurt, deals] = await Promise.all([
    all(() => db.from('player_game_stats').select('player_id, season, stats').in('season', back).lte('week', 12)),
    all(() => db.from('player_injuries').select('player_id, season, weeks').eq('season', season - 1)),
    all(() => db.from('contracts').select('player_id, first_season, last_season, role')),
  ]);
  const meta = Object.fromEntries(getAllPlayers().map((p) => [p.id, p])), hist = {}, known = Object.fromEntries(back.filter((s) => stats.some((r) => r.season === s)).map((s) => [s, true]));
  const of = (id) => (hist[id] ||= { rookieSeason: meta[id]?.rookieSeason ?? null, seasons: {}, injured: {}, roles: {}, signed: {}, known });
  for (const s of back) {   // each earlier site season, measured the same way as this one
    const rows = stats.filter((r) => r.season === s); if (!rows.length) continue;
    const players = {};
    rows.forEach((r) => { const p = (players[r.player_id] ||= { pos: meta[r.player_id]?.position || '?', games: 0, s: {} }); p.games += 1; for (const [k, v] of Object.entries(r.stats || {})) p.s[k] = (p.s[k] || 0) + v; });
    const vals = seasonValues(players), G = Math.max(1, ...Object.values(players).map((p) => p.games));
    for (const [id, p] of Object.entries(players)) of(id).seasons[s] = { games: p.games, G, val: impact(vals[id]) };
  }
  hurt.forEach((h) => { const x = of(h.player_id); x.injured[season - 1] = Math.min(12, (x.injured[season - 1] || 0) + (h.weeks || 0)); });
  deals.forEach((d) => {
    for (let s = d.first_season; s <= d.last_season && s < season; s++) {
      const x = of(d.player_id); x.signed[s] = true;
      if (d.role && x.roles[s] !== 'starter') x.roles[s] = d.role;   // a starter's deal wins if two overlap
    }
  });
  return hist;
}
