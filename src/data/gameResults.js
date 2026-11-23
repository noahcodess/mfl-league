// Official results. Watched or quick-simmed, a game is the same engine run: the server's kickoff seed, the real coin flip and
// the rivalry flag go into playGame, and the finished game (score plus every player's stats) is saved as final.
import { db } from './supabase.js';
import { loadCrowd } from './gameCrowd.js';
import { startGame } from './gameState.js';
import { loadLineups } from './gameLineups.js';
import { rivalPairs } from './games.js';
import { playGame } from '../lib/simGame.js';
import { isTestInput } from '../lib/simInputs.js';
import { recordInjuries } from './injuries.js';

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

// The one way a game is played. kick: { receiving, seed } from game_start. inputs: what people did live (timeouts, test tools).
export function playOfficial(lineups, homeId, awayId, kick, rivalry, inputs = [], crowd = null) {
  const receiver = kick?.receiving === homeId ? 'home' : kick?.receiving === awayId ? 'away' : undefined;
  const out = playGame(lineups.home, lineups.away, Number(kick?.seed) || 1, { receiver, rivalry: !!rivalry, inputs, crowd });
  return inputs.some(isTestInput) ? { ...out, testForced: true } : out;   // a test tool was used: this game is never saved as final
}
// Saves one live input with the game (commissioner). { n, kind, side?, ... }: see simInputs.
export const addGameInput = (gameId, input) => rpc('game_add_input', { p_game: Number(gameId), p_input: input });

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

// Saves a finished game. Safe to call twice: a final game never changes. A game bent by a test tool is never saved.
export async function finalizeGame(gameId, result, lineups, kick, method) {
  if (result.testForced) return { test: true };
  const teams = teamOf(lineups);
  const stats = Object.entries(result.players || {}).filter(([id]) => teams[id]).map(([id, s]) => ({ player_id: id, team_id: teams[id], stats: s }));
  const out = await rpc('game_finalize', { p_game: Number(gameId), p_home: result.score.home, p_away: result.score.away, p_ot: result.overtimes || 0,
    p_seed: Number(kick.seed), p_receiver: kick.receiving, p_method: method, p_teams: result.teams, p_scoring: result.scoring.map((x) => ({ ...x, text: result.plays[x.n - 1]?.text })), p_stats: stats });
  if (!out?.already) await recordInjuries(gameId, result.injuries).catch(() => null);   // who got hurt, and for how long
  gamesChanged();
  return out;
}

// Pause and resume: the whole engine run is kept the first time a game is shown (commissioner only), then the broadcast saves
// which play it's on, the score and the clock as it goes. A resumed game is that saved run, so it can't change.
export async function loadReplay(gameId, seed) {
  const { data } = await db.from('game_replays').select('seed, result').eq('game_id', Number(gameId)).maybeSingle();
  return data && Number(data.seed) === Number(seed) ? data.result : null;
}
export const saveReplay = (gameId, seed, result) => rpc('game_save_replay', { p_game: Number(gameId), p_seed: Number(seed), p_result: result }).catch(() => null);
export function saveProgress(gameId, i, play) {
  const b = play?.before; if (!b) return null;
  return rpc('game_progress', { p_game: Number(gameId), p_play: i, p_home: b.score.home, p_away: b.score.away, p_quarter: b.quarter, p_clock: Math.round(b.clock ?? 0), p_to_home: b.to?.home ?? null, p_to_away: b.to?.away ?? null }).catch(() => null);
}

// Quick sim: kickoff (coin flip + seed), the full engine run (or the saved one, if the game was paused), saved as final.
export async function simGameNow(gameId, homeId, awayId, method = 'quick', game = null) {
  const kick = await startGame(gameId);
  const [[home, away], rivalry, kept, crowd] = await Promise.all([loadLineups([homeId, awayId]), isRivalGame(homeId, awayId), kick.already ? loadReplay(gameId, kick.seed) : null,
    loadCrowd(game || { id: gameId, home: homeId, away: awayId })]);   // the same crowd a watched game gets
  const lineups = { home, away }, result = kept || playOfficial(lineups, homeId, awayId, kick, rivalry, kick.inputs || [], crowd);
  const saved = await finalizeGame(gameId, result, lineups, kick, method);
  return { result, lineups, saved };
}

export const unfinalizeGame = async (gameId) => { const out = await rpc('game_unfinalize', { p_game: Number(gameId) }); gamesChanged(); return out; };
