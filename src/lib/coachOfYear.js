// Coach of the Year: whose team did the most with what it had while its coach kept working at it. Winning, and beating
// what the team was expected to do (its preseason rank), its point differential, the moves he made (trades, signings,
// re-signings, his draft picks) and whether they helped, how the team is set up for the future (draft picks, young
// talent), and how active he is on the site. A coach who made no moves at all can still win, but it's rare.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// t: { winPct, rank (preseason overall rank, 1 = best), pd (point differential per game), moves: { trades, signings, resigns,
// draft }, helped (0-1: how much of the team's value came from players he brought in), picks (draft picks owned for the
// next two drafts), youth (0-1: young talent), activity: { days, minutes }, seasonDays }.
// Returns { score, parts: { success, diff, moves, future, active }, count }.
export function coachScore(t) {
  const expect = 0.75 - ((clamp(t.rank ?? 8, 1, 16) - 1) / 15) * 0.5;
  const success = 0.55 * t.winPct + 0.45 * clamp(0.5 + (t.winPct - expect) * 1.6);
  const diff = clamp(0.5 + (t.pd || 0) / 40);
  const m = t.moves || {}, count = (m.trades || 0) * 1.2 + (m.signings || 0) + (m.resigns || 0) * 0.6 + (m.draft || 0) * 0.3;
  const moves = 0.6 * (1 - Math.exp(-count / 3)) + 0.4 * clamp(t.helped || 0);
  const future = clamp(0.5 * clamp((t.picks || 0) / 8) + 0.5 * clamp(t.youth || 0));
  const days = t.activity?.days || 0, perDay = days ? (t.activity.minutes || 0) / days : 0;
  const active = clamp(0.7 * clamp(days / Math.max(14, (t.seasonDays || 60) * 0.6)) + 0.3 * clamp(perDay / 30));
  const raw = 0.34 * success + 0.1 * diff + 0.2 * moves + 0.14 * future + 0.22 * active;
  return { score: Math.round(raw * (count === 0 ? 0.55 : 1) * 1000) / 10, parts: { success, diff, moves, future, active }, count };
}
