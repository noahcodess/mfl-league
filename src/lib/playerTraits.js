// A player's hidden personality for contract talks: what he cares about (money, playing time, coach legacy)
// and how greedy he is. Seeded by player id so it never changes. Later the commissioner can edit these.
import { seeded } from './seed.js';

export function traitsFor(player) {
  const r = seeded('traits-' + player.id);
  const raw = [1 + r(10), 1 + r(10), 1 + r(10)];
  const sum = raw[0] + raw[1] + raw[2];
  const [money, playingTime, legacy] = raw.map((n) => n / sum);
  return {
    money, playingTime, legacy,
    // 0.85 (team-friendly) to 1.25 (wants every dollar), driven mostly by how much he cares about money.
    greed: Math.round((0.85 + money * 0.55 + r(11) / 100) * 100) / 100,
  };
}

export function topPriority(t) {
  if (t.money >= t.playingTime && t.money >= t.legacy) return 'Money';
  return t.playingTime >= t.legacy ? 'Playing time' : 'Coach legacy';
}
