// Game of the Year: how good a game was, from its final and its scoring plays. Close finishes count most, then the teams
// trading scores (lead changes, ties, answering each other), a late finish and a comeback, overtime, and two good teams.
// A low-scoring game can't really win it: under about 20 points combined it barely counts, from 25 up it counts fully,
// and a shootout gets a little extra.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// g: { hs, as (final score), ot, scoring: [{ side, pts, quarter }], q: [home win %, away win %] (their final records),
// prime, rivalry }. Returns { score, why }.
export function gameScore(g) {
  const total = g.hs + g.as, margin = Math.abs(g.hs - g.as);
  const totalK = total < 20 ? clamp(0.1 + ((total - 8) / 12) * 0.45, 0.1, 0.55) : total < 25 ? 0.75 + ((total - 20) / 5) * 0.25 : 1 + Math.min(0.25, (total - 25) / 80);
  let h = 0, a = 0, lead = 0, changes = 0, ties = 0, trades = 0, late = 0, prev = null, worst = { home: 0, away: 0 };
  for (const sc of g.scoring || []) {
    if (sc.side === 'home') h += sc.pts; else a += sc.pts;
    const now = Math.sign(h - a);
    if (now && lead && now !== lead) changes += 1;
    if (!now) ties += 1;
    if (now) lead = now;
    if (prev && prev !== sc.side) trades += 1;   // answering the other team's score
    if (sc.quarter >= 4) late += 1;
    prev = sc.side; worst.home = Math.min(worst.home, h - a); worst.away = Math.min(worst.away, a - h);
  }
  const winner = g.hs > g.as ? 'home' : 'away', comeback = -worst[winner], quality = ((g.q?.[0] ?? 0.5) + (g.q?.[1] ?? 0.5)) / 2;
  const raw = Math.exp(-margin / 7) * 10 + changes * 1.4 + ties * 0.8 + trades * 0.5 + late * 0.7 + Math.min(comeback, 21) * 0.18 + (g.ot ? 1.4 + (g.ot - 1) * 0.5 : 0)
    + quality * 7 + (g.prime ? 0.5 : 0) + (g.rivalry ? 0.8 : 0);
  const why = [`${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)}${g.ot ? (g.ot > 1 ? ` ${g.ot}OT` : ' OT') : ''}`, changes && `${changes} lead change${changes > 1 ? 's' : ''}`,
    comeback >= 10 && `${comeback}-point comeback`, ties && `tied ${ties}x`].filter(Boolean).join(' · ');
  return { score: Math.round(raw * totalK * 10) / 10, why };
}
