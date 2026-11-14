// Who plays on kicks. Every unit is 10 players picked by ratings: fast sure tacklers cover kicks, good blockers block on
// returns (bad blockers stay off), the most dangerous backup returns them. A quarterback never plays special teams.
// Rosters have no kickers or punters, so every team uses the same league kicker and punter.
import { rate } from './simLineup.js';

const leg = (id, name, pos, r) => ({ id, name, last: name, pos, number: pos === 'K' ? 3 : 9, stars: 3, r, style: null, height: 72, weight: 195, mood: 'normal', durability: 90, recovery: 70, league: true });
export const leagueKicker = (teamId) => leg(`${teamId}-K`, 'Kicker', 'K', { kick_power: 80, kick_accuracy: 80, speed: 55, toughness: 60 });
export const leaguePunter = (teamId) => leg(`${teamId}-P`, 'Punter', 'P', { kick_power: 78, kick_accuracy: 76, speed: 55, toughness: 60 });

const avg = (p, keys) => keys.reduce((s, k) => s + rate(p, k), 0) / keys.length;
const SCORE = {
  cover: (p) => avg(p, ['speed', 'tackling', 'pursuit']),                      // run down the returner
  block: (p) => avg(p, ['run_block', 'strength']) * 0.8 + rate(p, 'speed') * 0.2, // open a lane for him
  returner: (p) => avg(p, ['speed', 'agility', 'run_after_catch', 'elusiveness', 'acceleration', 'catching']) + (p.starter ? -6 : 0),
  protect: (p) => avg(p, ['pass_block', 'strength', 'anchor']),                // hold the line on punts and field goals
  rush: (p) => avg(p, ['speed', 'block_shed', 'jumping']),                     // come after the kick
  hands: (p) => avg(p, ['catching', 'awareness']),                             // hold for the kicker
};
const best = (pool, score, n, skip = new Set()) => pool.filter((p) => !skip.has(p.id)).sort((a, b) => score(b) - score(a)).slice(0, n);

// lineup: from buildLineup. Returns six units, each { key: label, players: [...] } with any specialist named.
export function buildKickTeams(lineup) {
  const pool = lineup.all.filter((p) => p.pos !== 'QB'), K = leagueKicker(lineup.teamId), P = leaguePunter(lineup.teamId);
  const returner = best(pool.filter((p) => ['WR', 'RB', 'CB', 'SS'].includes(p.pos)), SCORE.returner, 1)[0] || null, noRet = new Set([returner?.id]);
  const holder = best(pool.filter((p) => ['TE', 'WR', 'SS'].includes(p.pos) && !p.starter), SCORE.hands, 1)[0] || best(pool, SCORE.hands, 1)[0] || null;
  const gunners = best(pool, SCORE.cover, 2), noGun = new Set(gunners.map((p) => p.id));
  return {
    kickoff: { label: 'Kickoff', kicker: K, players: [K, ...best(pool, SCORE.cover, 9)] },
    kickReturn: { label: 'Kick return', returner, players: [returner, ...best(pool, SCORE.block, 9, noRet)].filter(Boolean) },
    punt: { label: 'Punt', punter: P, players: [P, ...gunners, ...best(pool, SCORE.protect, 7, noGun)] },
    puntReturn: { label: 'Punt return', returner, players: [returner, ...best(pool, SCORE.rush, 4, noRet), ...best(pool, SCORE.block, 9, noRet)].filter(Boolean).filter((p, i, a) => a.findIndex((q) => q.id === p.id) === i).slice(0, 10) },
    fieldGoal: { label: 'Field goal', kicker: K, holder, players: [K, holder, ...best(pool, SCORE.protect, 8, new Set([holder?.id]))].filter(Boolean) },
    fieldGoalBlock: { label: 'Field goal block', players: best(pool, SCORE.rush, 10) },
  };
}
