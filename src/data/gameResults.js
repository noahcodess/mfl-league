// Official results. Watched or quick-simmed, a game is the same engine run: the server's kickoff seed, the real coin flip and
// the rivalry flag go into playGame, and the finished game (score plus every player's stats) is saved as final.
import { db } from './supabase.js';
import { startGame } from './gameState.js';
import { loadLineups } from './gameLineups.js';
import { rivalPairs } from './games.js';
import { playGame } from '../lib/simGame.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}
export const gamesChanged = () => window.dispatchEvent(new CustomEvent('mfl-games-changed'));

let rivals = null;
export async function isRivalGame(homeId, awayId) {
  rivals ||= rivalPairs().then((pairs) => new Set(pairs.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`])));
  return (await rivals).has(`${homeId}|${awayId}`);
}

// The one way a game is played. kick: { receiving, seed } from game_start.
export function playOfficial(lineups, homeId, awayId, kick, rivalry) {
  const receiver = kick?.receiving === homeId ? 'home' : kick?.receiving === awayId ? 'away' : undefined;
  return playGame(lineups.home, lineups.away, Number(kick?.seed) || 1, { receiver, rivalry: !!rivalry });
}

// Which team every player in the game played for (starters, backups and the kick teams).
function teamOf(lineups) {
  const out = {};
  for (const side of ['home', 'away']) {
    const l = lineups[side], tid = l.team?.id || l.teamId;
    (l.all || []).forEach((p) => { out[p.id] = tid || p.teamId; });
    Object.values(l.kickTeams || {}).forEach((u) => (u.players || []).forEach((p) => { out[p.id] ||= tid || p.teamId; }));
  }
  return out;
}

// Saves a finished game. Safe to call twice: a final game never changes.
export async function finalizeGame(gameId, result, lineups, kick, method) {
  const teams = teamOf(lineups);
  const stats = Object.entries(result.players || {}).filter(([id]) => teams[id]).map(([id, s]) => ({ player_id: id, team_id: teams[id], stats: s }));
  const out = await rpc('game_finalize', { p_game: Number(gameId), p_home: result.score.home, p_away: result.score.away, p_ot: result.overtimes || 0,
    p_seed: Number(kick.seed), p_receiver: kick.receiving, p_method: method, p_teams: result.teams, p_scoring: result.scoring, p_stats: stats });
  gamesChanged();
  return out;
}

// Quick sim: kickoff (coin flip + seed), the full engine run, saved as final. Takes a second or two.
export async function simGameNow(gameId, homeId, awayId, method = 'quick') {
  const kick = await startGame(gameId);
  const [[home, away], rivalry] = await Promise.all([loadLineups([homeId, awayId]), isRivalGame(homeId, awayId)]);
  const lineups = { home, away }, result = playOfficial(lineups, homeId, awayId, kick, rivalry);
  const saved = await finalizeGame(gameId, result, lineups, kick, method);
  return { result, lineups, saved };
}

export const unfinalizeGame = async (gameId) => { const out = await rpc('game_unfinalize', { p_game: Number(gameId) }); gamesChanged(); return out; };
