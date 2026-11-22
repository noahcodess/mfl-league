// Orders teams the league's way. Ties are broken in this order: 1 overall record, 2 conference record, 3 point
// differential, 4 wins against common opponents in the conference, 5 wins against common opponents from the other
// conference, 6 points scored, 7 points allowed, 8 a coin flip (seeded, so it's the same flip every time it's drawn).
// A tie of three or more is split as a group: each step peels off whoever is ahead, the rest go on to the next step.
const pct = (w, l) => (w + l ? w / (w + l) : 0);
const flip = (id, seed) => { let h = seed >>> 0; for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0; return h / 4294967296; };

// rows: [{ id, w, l, pf, pa, games: [{ opp, won }] }]. confOf: team id -> conference. Records without games (totals only)
// fall straight through to point differential, points scored and allowed.
export function rankRows(rows, confOf, seed = 1) {
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  const commonWins = (group, sameConf) => {   // opponents every team in the group played, in (or out of) their conference
    const sets = group.map((r) => new Set((r.games || []).map((g) => g.opp)));
    const common = [...sets[0]].filter((o) => sets.every((s) => s.has(o)) && !group.some((r) => r.id === o) && (confOf[o] === confOf[group[0].id]) === sameConf);
    return (r) => (r.games || []).filter((g) => g.won && common.includes(g.opp)).length;
  };
  const steps = [
    () => (r) => pct(r.w, r.l),
    () => (r) => { const c = (r.games || []).filter((g) => confOf[g.opp] === confOf[r.id]); return pct(c.filter((g) => g.won).length, c.filter((g) => !g.won).length); },
    () => (r) => (r.pf || 0) - (r.pa || 0),
    (g) => commonWins(g, true),
    (g) => commonWins(g, false),
    () => (r) => r.pf || 0,
    () => (r) => -(r.pa || 0),
    () => (r) => flip(r.id, seed),
  ];
  const split = (group, k) => {
    if (group.length < 2 || k >= steps.length) return group;
    const val = steps[k](group), buckets = new Map();
    group.forEach((r) => { const v = val(r); buckets.set(v, [...(buckets.get(v) || []), r]); });
    return [...buckets.keys()].sort((a, b) => b - a).flatMap((v) => split(buckets.get(v), k + 1));
  };
  return split(rows.map((r) => by[r.id]), 0);
}
