// Game-day lineups for the engine: a team's 10 starters on offense and 10 on defense, each carrying everything the engine
// needs (every rating, archetype, height, weight, mood, injury ratings). Whoever is set as a starter on the roster plays;
// an empty starting spot is filled by the best backup at that position and reported as a problem.
import { ATTRIBUTES } from './attributeDefs.js';
import { seeded } from './seed.js';

export const OFFENSE_SLOTS = [['QB', 1], ['RB', 1], ['WR', 1], ['WR', 2], ['TE', 1], ['OT', 1], ['OG', 1], ['C', 1], ['OG', 2], ['OT', 2]];
export const DEFENSE_SLOTS = [['DE', 1], ['DT', 1], ['DL', 1], ['DT', 2], ['DE', 2], ['LB', 1], ['LB', 2], ['CB', 1], ['CB', 2], ['SS', 1]];

// Stand-in ratings from a player's stars, for anyone the database has no ratings for yet (the same numbers every time).
function fromStars(p) {
  const roll = seeded(`attr-${p.id}`), target = 28 + p.stars * 13;
  return Object.fromEntries((ATTRIBUTES[p.position] || []).map(([key]) => [key, Math.max(25, Math.min(99, Math.round(target + roll(25) - 12)))]));
}

// One player as the engine sees him. attrs: { ratings, style } and inj: { durability, recovery } from the database.
export function simPlayer(p, attrs, inj) {
  const r = attrs?.ratings || fromStars(p), tough = r.toughness ?? 60;
  return {
    id: p.id, name: p.name, last: p.name.split(' ').slice(1).join(' ') || p.name, pos: p.position, number: p.number, stars: p.stars, age: p.age,
    starter: p.depth === 'starter', slot: p.slot, r, style: attrs?.style || null, guessed: !attrs?.ratings,
    height: p.height || null, weight: p.weight || null, mood: p.mood || 'normal',
    durability: inj?.durability ?? Math.round(tough * 0.55 + 30), recovery: inj?.recovery ?? 60,
  };
}

// A rating by name. Players don't have every rating (a guard has no Catching), so anything he lacks reads as `floor`.
export const rate = (p, key, floor = 35) => p?.r?.[key] ?? floor;
export const overall = (p) => { const v = Object.values(p.r); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };

function fill(slots, all, problems, side) {
  const used = new Set(), out = [];
  slots.forEach(([pos, slot]) => {
    const key = `${pos}${slots.filter(([q]) => q === pos).length > 1 ? slot : ''}`;
    let p = all.find((x) => x.pos === pos && x.starter && x.slot === slot && !used.has(x.id));
    if (!p) {
      p = all.filter((x) => x.pos === pos && !used.has(x.id)).sort((a, b) => overall(b) - overall(a))[0];
      problems.push(p ? `${side}: no starter at ${key}, so ${p.name} fills in` : `${side}: nobody on the roster can play ${key}`);
    }
    if (p) used.add(p.id);
    out.push({ key, player: p || null });
  });
  return out;
}

// players: the team's roster from the league store. attrsById / injById: database rows keyed by player id.
// Returns { teamId, offense: [{ key, player }], defense: [...], bench: [players], all, problems: [text], strength: { off, def } }.
export function buildLineup(team, players, attrsById = {}, injById = {}) {
  const all = players.filter((p) => p.status !== 'retired').map((p) => simPlayer(p, attrsById[p.id], injById[p.id])), problems = [];
  const offense = fill(OFFENSE_SLOTS, all, problems, 'Offense'), defense = fill(DEFENSE_SLOTS, all, problems, 'Defense');
  const on = new Set([...offense, ...defense].map((s) => s.player?.id)), bench = all.filter((p) => !on.has(p.id));
  const avg = (list) => { const ps = list.map((s) => s.player).filter(Boolean); return ps.length ? Math.round(ps.reduce((a, p) => a + overall(p), 0) / ps.length) : 0; };
  const guessed = all.filter((p) => p.guessed).length;
  if (guessed) problems.push(`${guessed} player${guessed > 1 ? 's have' : ' has'} no ratings in the database yet, so stand-ins from stars are used`);
  return { teamId: team.id, offense, defense, bench, all, problems, strength: { off: avg(offense), def: avg(defense) } };
}
