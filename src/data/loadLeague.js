// Loads teams, players, picks, issues and settings from the database into the store, in the same shape as the import.
import { db } from './supabase.js';
import { store } from './store.js';

const rating = (stars, rank) => (stars == null ? null : { stars: Number(stars), rank });

const toTeam = (t) => ({
  id: t.id, code: t.code, name: t.name, conference: t.conference, color: t.color, accent: t.accent, isBot: t.is_bot,
  offense: rating(t.offense_stars, t.offense_rank),
  defense: rating(t.defense_stars, t.defense_rank),
  overall: rating(t.overall_stars, t.overall_rank),
  capUsedReported: t.cap_used_reported,
});

const toPlayer = (p) => ({
  id: p.id, teamId: p.team_id, name: p.name, position: p.position, depth: p.depth, slot: p.slot,
  stars: p.stars == null ? null : Number(p.stars), elite: p.elite, age: p.age, mood: p.mood,
  nationality: p.nationality, notes: p.notes ?? [],
  contract: p.contract_years ? { years: p.contract_years, total: p.contract_total } : null,
});

const toPick = (p) => ({ ownerId: p.owner_id, originalCode: p.original_code, season: p.season, round: p.round });
const toIssue = (i) => ({ kind: i.kind, teamId: i.team_id, text: i.text, level: i.level });

// Returns true if the live data loaded. If the database can't be reached, the bundled import stays in place.
export async function loadLeague() {
  try {
    const [teams, players, picks, issues, settings] = await Promise.all([
      db.from('teams').select('*'),
      db.from('players').select('*').order('id'),
      db.from('picks').select('*'),
      db.from('import_issues').select('*').order('id'),
      db.from('league_settings').select('*'),
    ]);
    const failed = [teams, players, picks, settings].find((r) => r.error);
    if (failed) throw failed.error;
    const meta = Object.fromEntries(settings.data.map((s) => [s.key, s.value]));
    store.league = {
      meta: { capLimit: meta.cap_limit, currentSeason: meta.current_season, phase: meta.phase },
      teams: teams.data.map(toTeam),
      players: players.data.map(toPlayer),
      picks: picks.data.map(toPick),
      vacancies: store.league.vacancies, // still from the import until roster editing exists
    };
    if (!issues.error) store.issues = issues.data.map(toIssue);
    store.source = 'live';
    return true;
  } catch (e) {
    console.warn('Using bundled league data:', e?.message || e);
    return false;
  }
}
