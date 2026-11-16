// The kicking math: how far a kicker's leg carries and how often he hits it, straight from his bars (a 10 bar = 100).
// Kick Power is his range: a 10 makes about 75% from 60, about 1 in 10 from 65, about 1 in 50 from 67, and nothing past 68.
// A 9 tops out around 56-60, an 8 around 51-54.
// Kick Accuracy barely matters up close (a 6 still makes his 30-yarders) and matters more with every yard past 35.
// Kickers have a day like everyone else, just a smaller one. Weather and wind join in Part 4.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MOOD = { unhappy: 1.5, angry: 3 };

// A kicking bar as it plays today. Someone who isn't a kicker reads as 40 on every kicking bar.
export function legRating(G, K, key) {
  const raw = K?.r?.[key] ?? 40;
  return raw + (K?.form || 0) * 0.4 + (G?.form?.[K?.side] || 0) * 0.25 - (MOOD[K?.mood] || 0);
}

// The kick he makes about half the time (yards): 100 -> 62.7, 90 -> 57.4, 80 -> 51.5, 70 -> 47, 60 -> 42.5, 40 -> 33.5.
export const longest = (kp) => (kp <= 80 ? 38 + (kp - 50) * 0.45 : 51.5 + (kp - 80) * 0.62 - (kp - 80) ** 2 * 0.003);
// Nobody makes one longer than this.
export const MAX_FG = 68;

// The chance a field goal from `dist` yards is good: does it carry (power), and is it straight (accuracy).
export function makeOdds(dist, kp, ka) {
  if (dist > MAX_FG) return 0;
  const carry = 1 / (1 + Math.exp((dist - longest(kp)) / 1.15));
  const aim = 0.015 + Math.max(0, 85 - ka) * 0.0012 + Math.max(0, dist - 33) * (0.0055 + Math.max(0, 92 - ka) * 0.00042);
  return clamp(carry * (1 - clamp(aim, 0.005, 0.9)), 0.001, 0.995);
}

// Kickoffs: touchback chance from power (college rules: it has to clear the end zone), and how often one hooks out.
export const touchbackOdds = (kp) => clamp(0.08 + (kp - 55) * 0.014, 0.02, 0.75);
export const kickoffOobOdds = (ka) => clamp(0.015 + (65 - ka) * 0.003, 0.003, 0.1);
// Punts: average distance and hang time from power; shanks and pinning it deep from accuracy.
export const puntDistance = (pp) => 37 + (pp - 50) * 0.21;
export const puntHang = (pp) => clamp(3.6 + (pp - 50) * 0.025, 3.2, 5);
export const shankOdds = (pa) => clamp(0.03 + (65 - pa) * 0.003, 0.004, 0.12);
export const pinOdds = (pa) => clamp(0.2 + (pa - 70) * 0.015, 0.04, 0.6);
