// Season awards: gathers a season's numbers (every player's regular-season stats, the games and their scoring, each team's
// moves, draft picks, young talent and its coach's activity) for awardRank, and saves and loads each award's list (the
// commissioner's order). Lists keep a snapshot of each name, so they read right even after players move on.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { getTeams, currentSeason, currentWeek, currentPhase, awardsUntil } from './teams.js';
import { getAllPlayers } from './players.js';
import { rankAwards } from '../lib/awardRank.js';
import { seasonValues } from '../lib/awardMath.js';

const all = async (q) => { const out = []; for (let from = 0; ; from += 1000) { const { data, error } = await q().range(from, from + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out; } };

// Everything awardRank needs for a season (regular season only: weeks 1-12).
export async function seasonInputs(season) {
  if (DEMO) return null;
  const [stats, results, games, moves, offers, events, drafted, picks] = await Promise.all([
    all(() => db.from('player_game_stats').select('player_id, team_id, week, stats').eq('season', season).lte('week', 12)),
    all(() => db.from('game_results').select('game_id, week, home_score, away_score, overtimes, teams, scoring').eq('season', season).lte('week', 12)),
    all(() => db.from('games').select('id, home_team, away_team, kind, prime, created_at').eq('season', season)),
    all(() => db.from('player_moves').select('player_id, to_team, kind, trade_id').eq('season', season)),
    all(() => db.from('fa_offers').select('player_id, team_id, status').eq('season', season).in('status', ['agreed', 'approved'])),
    all(() => db.from('league_events').select('team_id, kind').eq('season', season).eq('kind', 'resigned')),
    all(() => db.from('draft_selections').select('team_id, player_id').eq('season', season).not('player_id', 'is', null)),
    all(() => db.from('picks').select('owner_id, season, round').in('season', [season + 1, season + 2])),
  ]);
  const meta = Object.fromEntries(getAllPlayers().map((p) => [p.id, p])), players = {};
  stats.forEach((r) => {
    const m = meta[r.player_id], p = (players[r.player_id] ||= { name: m?.name || r.player_id, pos: m?.position || '?', team: r.team_id, rookie: m?.rookieSeason === season, games: 0, s: {} });
    p.games += 1; p.team = r.team_id;
    for (const [k, v] of Object.entries(r.stats || {})) p.s[k] = /long/.test(k) ? Math.max(p.s[k] || 0, v) : (p.s[k] || 0) + v;
  });
  const kinds = Object.fromEntries(games.map((g) => [g.id, g])), regular = results.filter((r) => kinds[r.game_id]?.kind === 'regular');
  const teams = Object.fromEntries(getTeams().map((t) => [t.id, { w: 0, l: 0, pf: 0, pa: 0, rank: t.overall?.rank ?? 8, moves: { trades: 0, signings: 0, resigns: 0, draft: 0 }, picks: 0, youth: 0, helped: 0, activity: { days: 0, minutes: 0 } }]));
  regular.forEach((r) => {
    const g = kinds[r.game_id], h = teams[g.home_team], a = teams[g.away_team]; if (!h || !a) return;
    h.pf += r.home_score; h.pa += r.away_score; a.pf += r.away_score; a.pa += r.home_score;
    if (r.home_score > r.away_score) { h.w += 1; a.l += 1; } else { a.w += 1; h.l += 1; }
  });
  const came = {};   // who each team brought in this season
  new Set(moves.filter((m) => m.kind === 'trade').map((m) => `${m.trade_id}:${m.to_team}`)).forEach((k) => { const t = teams[k.split(':')[1]]; if (t) t.moves.trades += 1; });
  moves.forEach((m) => { (came[m.to_team] ||= new Set()).add(m.player_id); });
  offers.forEach((o) => { if (teams[o.team_id]) teams[o.team_id].moves.signings += 1; (came[o.team_id] ||= new Set()).add(o.player_id); });
  events.forEach((e) => { if (teams[e.team_id]) teams[e.team_id].moves.resigns += 1; });
  drafted.forEach((d) => { if (teams[d.team_id]) teams[d.team_id].moves.draft += 1; (came[d.team_id] ||= new Set()).add(d.player_id); });
  picks.forEach((p) => { if (teams[p.owner_id]) teams[p.owner_id].picks += p.round === 1 ? 2 : p.round === 2 ? 1.3 : 1; });
  const vals = seasonValues(players), worth = (id) => Math.max(0, vals[id]?.pts || 0);
  for (const [id, t] of Object.entries(teams)) {
    const roster = getAllPlayers().filter((p) => p.teamId === id), young = roster.filter((p) => (p.age ?? 30) <= 23);
    t.youth = roster.length ? Math.min(1, young.reduce((n, p) => n + (p.stars || 0), 0) / (roster.length * 2.2)) : 0;
    const mine = Object.entries(players).filter(([, p]) => p.team === id), total = mine.reduce((n, [pid]) => n + worth(pid), 0);
    t.helped = total ? mine.filter(([pid]) => came[id]?.has(pid)).reduce((n, [pid]) => n + worth(pid), 0) / total : 0;
  }
  const since = games.map((g) => g.created_at).sort()[0]?.slice(0, 10) || new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const { data: act } = await db.rpc('coach_activity_summary', { p_since: since });
  (act || []).forEach((a) => { if (teams[a.team_id]) teams[a.team_id].activity = { days: a.days, minutes: a.minutes }; });
  const seasonDays = Math.min(150, Math.max(1, Math.round((Date.now() - new Date(since).getTime()) / 864e5)));
  const list = regular.map((r) => { const g = kinds[r.game_id]; return { id: r.game_id, week: r.week, home: g.home_team, away: g.away_team, hs: r.home_score, as: r.away_score, ot: r.overtimes || 0, scoring: r.scoring || [], prime: !!g.prime }; });
  return { players, teams, games: list, seasonDays };
}

// The numbers' top 5 for every award, each entry with a snapshot (name, team, position) for the saved list.
export async function computeAwards(season) {
  const inp = DEMO && import.meta.env.DEV ? await (await import('./awardsDemo.js')).demoInputs() : await seasonInputs(season);   // dev: a quick simulated season
  if (!inp) return null;
  const ranked = rankAwards(inp), teamName = (id) => getTeams().find((t) => t.id === id)?.name || id;
  const snap = (key, r) => key === 'coy' ? { ...r, name: teamName(r.id), team: r.id } : key === 'goty' ? (() => { const g = inp.games.find((x) => String(x.id) === r.id); return { ...r, name: `${teamName(g.away)} at ${teamName(g.home)}`, team: null }; })()
    : { ...r, name: inp.players[r.id].name, team: inp.players[r.id].team, pos: inp.players[r.id].pos };
  return { inputs: inp, lists: Object.fromEntries(Object.entries(ranked).map(([k, rows]) => [k, rows.map((r) => snap(k, r))])) };
}

export async function savedAwards(season) {
  if (DEMO) return {};
  const { data } = await db.from('season_awards').select('award, entries, edited').eq('season', season);
  return Object.fromEntries((data || []).map((r) => [r.award, r]));
}
export async function saveAward(season, award, entries, edited) {
  if (DEMO) return;
  const { error } = await db.rpc('save_award', { p_season: season, p_award: award, p_entries: entries, p_edited: edited });
  if (error) throw new Error(error.message);
}
export async function setAwardsUntil(week) {
  if (DEMO) return;
  const { error } = await db.rpc('set_awards_display', { p_until: week });
  if (error) throw new Error(error.message);
}

// The League tab: last season's finalists (top 3 of each award), while they're still on display. null: nothing to show.
export function useShownAwards() {
  const [v, setV] = useState(null), season = currentSeason() - 1;
  const on = awardsUntil() >= 0 && (currentPhase() !== 'regular_season' || currentWeek() <= awardsUntil());
  useEffect(() => { if (!on || DEMO) return; savedAwards(season).then((m) => setV(Object.keys(m).length ? { season, lists: m } : null)).catch(() => {}); }, [on, season]);
  return on ? v : null;
}
