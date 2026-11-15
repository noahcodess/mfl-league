// Who plays on kicks. Every unit is 10 players picked by ratings: fast sure tacklers cover kicks, good blockers block on
// returns (bad blockers stay off), the most dangerous backup returns them. A quarterback never plays special teams.
// The team's kicker does both jobs (kicks and punts). No kicker on the roster means an emergency kicker: a backup who has
// never kicked, so every kicking bar reads as the floor and he's bad at it.
import { rate } from './simLineup.js';

const SKILL = ['TE', 'WR', 'SS', 'CB', 'RB', 'LB'];
export function teamKicker(lineup) {
  const ks = lineup.all.filter((p) => p.pos === 'K').sort((a, b) => (b.starter - a.starter) || (a.slot ?? 9) - (b.slot ?? 9));
  if (ks[0]) return ks[0];
  const subs = lineup.all.filter((p) => p.pos !== 'QB' && !p.starter);
  return subs.sort((a, b) => SKILL.indexOf(a.pos) - SKILL.indexOf(b.pos) + (SKILL.indexOf(a.pos) < 0 ? 9 : 0) - (SKILL.indexOf(b.pos) < 0 ? 9 : 0))[0]
    || lineup.all.find((p) => p.pos !== 'QB') || null;
}

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
  const K = teamKicker(lineup), P = K, pool = lineup.all.filter((p) => p.pos !== 'QB' && p.pos !== 'K' && p.id !== K?.id);
  const returner = best(pool.filter((p) => ['WR', 'RB', 'CB', 'SS'].includes(p.pos)), SCORE.returner, 1)[0] || null, noRet = new Set([returner?.id]);
  const holder = best(pool.filter((p) => ['TE', 'WR', 'SS'].includes(p.pos) && !p.starter), SCORE.hands, 1)[0] || best(pool, SCORE.hands, 1)[0] || null;
  const gunners = best(pool, SCORE.cover, 2), noGun = new Set(gunners.map((p) => p.id));
  return {
    kickoff: { label: 'Kickoff', kicker: K, players: [K, ...best(pool, SCORE.cover, 9)].filter(Boolean) },
    kickReturn: { label: 'Kick return', returner, players: [returner, ...best(pool, SCORE.block, 9, noRet)].filter(Boolean) },
    punt: { label: 'Punt', punter: P, players: [P, ...gunners, ...best(pool, SCORE.protect, 7, noGun)].filter(Boolean) },
    puntReturn: { label: 'Punt return', returner, players: [returner, ...best(pool, SCORE.rush, 4, noRet), ...best(pool, SCORE.block, 9, noRet)].filter(Boolean).filter((p, i, a) => a.findIndex((q) => q.id === p.id) === i).slice(0, 10) },
    fieldGoal: { label: 'Field goal', kicker: K, holder, players: [K, holder, ...best(pool, SCORE.protect, 8, new Set([holder?.id]))].filter(Boolean) },
    fieldGoalBlock: { label: 'Field goal block', players: best(pool, SCORE.rush, 10) },
  };
}
