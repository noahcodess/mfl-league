// The game engine's basic tools: seeded dice (the same seed always gives the same game), a player's rating as it counts
// right now (mood and momentum included), odds from a rating gap, stat keeping and the momentum meter.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const other = (side) => (side === 'home' ? 'away' : 'home');
// The chance the first side wins a contest when it's `diff` rating points better. k: how many points make a big edge.
export const odds = (diff, k = 10) => 1 / (1 + Math.exp(-diff / k));

export function dice(seed) {
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = (mean = 0, sd = 1) => mean + sd * Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  return { r, gauss, chance: (p) => r() < p, int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), pick: (list) => list[Math.floor(r() * list.length)] };
}

// Unhappy players don't play as hard; angry ones a bit less. Nobody gets a bonus for being happy.
const MOOD = { unhappy: 1.5, angry: 3 };
// A rating as it plays on this snap. Momentum is worth up to 2.5 points to the team that has it. Every team and every player
// also has form on the day, set once when the game starts: most players land within a few points of their rating, but
// about 1 in 12 has a big day or a bad one (5 to 9 points), so a 4-star can play like a 4.5 and a star can disappear.
// Garbage time: from the 2nd quarter on, a team up big lets off the gas (softer coverage, backups' effort, playing it
// safe) and the team down big keeps fighting. Pros don't quit, so leads shrink: this keeps most games within a score or two.
function ease(G, side) {
  const s = G.s; if (!s || s.quarter < 2) return 0;
  const d = s.score[side] - s.score[side === 'home' ? 'away' : 'home'];
  return d >= 24 ? -8 : d >= 17 ? -6 : d >= 10 ? -4 : d <= -24 ? 3.5 : d <= -17 ? 3 : d <= -10 ? 2 : 0;
}
const SPREAD = 0.66;
export function val(G, p, key, floor = 35) {
  if (!p) return floor;
  const raw = p.r[key] ?? floor, r = 66 + (raw - 66) * SPREAD;   // pros are closer together on any one snap than their ratings look
  return r + ease(G, p.side) - (MOOD[p.mood] || 0) + G.mom * (p.side === 'home' ? 1.5 : -1.5) + (G.form?.[p.side] || 0) + (p.form || 0) + (G.answer === p.side ? G.answerBoost : 0);   // overtime: the team answering a score knows exactly what it needs
}
// A weighted blend of ratings: mix(G, p, { pass_block: 0.5, strength: 0.5 }).
export const mix = (G, p, weights, floor = 35) => Object.entries(weights).reduce((s, [k, w]) => s + val(G, p, k, floor) * w, 0);
// The best of several ratings a player might have (a back's Elusiveness, a receiver's Run After Catch...).
export const top = (G, p, keys, floor = 35) => Math.max(floor, ...keys.map((k) => (p?.r[k] == null ? 0 : val(G, p, k))));

export function stat(play, p, key, n = 1) { if (p && !play.noStats) play.stats.push([p.id, key, n]); }
// Momentum runs from -1 (all away) to +1 (all home). amt: how big the moment was (a touchdown about 0.25).
export function swing(G, side, amt) { const a = side === 'home' && amt > 0 ? amt * (1 + 0.3 * (G.crowdE || 0)) : amt; G.mom = clamp(G.mom + (side === 'home' ? a : -a), -1, 1); }   // momentum.js: a loud house lands the home team's moments harder

// Per-play fatigue: how much speed a runner has lost after `ran` yards on this snap. Toughness slows the fade. Tops out at 20%.
export const tired = (G, p, ran) => clamp((ran - 15) * 0.004 * (1.3 - val(G, p, 'toughness', 60) / 100), 0, 0.2);
