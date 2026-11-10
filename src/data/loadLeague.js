// Loads teams, players, picks, issues and settings from the database into the store, in the same shape as the import.
import { db } from './supabase.js';
import { store } from './store.js';
import { selectAll } from './selectAll.js';
import { applyDemoOverrides } from './demo.js';

const rating = (stars, rank) => (stars == null ? null : { stars: Number(stars), rank });

const toTeam = (t) => ({
  id: t.id, code: t.code, name: t.name, conference: t.conference, color: t.color, accent: t.accent, isBot: t.is_bot,
  offense: rating(t.offense_stars, t.offense_rank),
  defense: rating(t.defense_stars, t.defense_rank),
  overall: rating(t.overall_stars, t.overall_rank),
  capUsedReported: t.cap_used_reported, reserved: t.reserved,
});

const toPlayer = (p) => ({
  id: p.id, teamId: p.team_id, name: p.name, position: p.position, depth: p.depth, slot: p.slot,
  stars: p.stars == null ? null : Number(p.stars), elite: p.elite, age: p.age, mood: p.mood,
  nationality: p.nationality, notes: p.notes ?? [], number: p.number, playStyle: p.play_style, looks: p.looks || {},
  status: p.status, previousTeamId: p.previous_team_id,
});

const toContract = (c) => ({ perYear: c.per_year, total: c.total, firstSeason: c.first_season, lastSeason: c.last_season, source: c.source, role: c.role });
const toEvent = (e) => ({ id: e.id, season: e.season, phase: e.phase, kind: e.kind, playerId: e.player_id, teamId: e.team_id, summary: e.summary, data: e.data, at: e.created_at });

const toPick = (p) => ({ ownerId: p.owner_id, originalCode: p.original_code, season: p.season, round: p.round });
const toIssue = (i) => ({ kind: i.kind, teamId: i.team_id, text: i.text, level: i.level });

// Returns true if the live data loaded. If the database can't be reached, the bundled import stays in place.
export async function loadLeague() {
  try {
    const [teams, players, picks, issues, settings, contracts, events] = await Promise.all([
      db.from('teams').select('*'),
      selectAll(() => db.from('players').select('*').neq('status', 'retired').order('id')),
      db.from('picks').select('*'),
      db.from('import_issues').select('*').order('id'),
      db.from('league_settings').select('*'),
      selectAll(() => db.from('contracts').select('*').eq('status', 'active').order('id')),
      db.from('league_events').select('*').order('id', { ascending: false }).limit(80),
    ]);
    const failed = [teams, players, picks, settings, contracts].find((r) => r.error);
    if (failed) throw failed.error;
    const meta = Object.fromEntries(settings.data.map((s) => [s.key, s.value]));
    const byPlayer = Object.fromEntries(contracts.data.map((c) => [c.player_id, toContract(c)]));
    store.league = {
      meta: { capLimit: meta.cap_limit, currentSeason: meta.current_season, phase: meta.phase, maxAge: meta.max_age ?? 27, agedForSeason: meta.aged_for_season ?? 0, testMode: meta.test_mode === true, offseasonStep: meta.offseason_step ?? 0,
        faRound: meta.fa_round ?? 0, faRounds: meta.fa_rounds ?? 4, maxRoster: meta.max_roster ?? 45, maxOpenOffers: meta.max_open_offers ?? 6 },
      teams: teams.data.map(toTeam),
      players: players.data.map((p) => ({ ...toPlayer(p), contract: byPlayer[p.id] || null })),
      picks: picks.data.map(toPick),
      vacancies: store.league.vacancies, // still from the import until roster editing exists
    };
    if (!issues.error) store.issues = issues.data.map(toIssue);
    store.events = events.error ? [] : events.data.map(toEvent);
    store.source = 'live';
    applyDemoOverrides();
    return true;
  } catch (e) {
    console.warn('Using bundled league data:', e?.message || e);
    return false;
  }
}
