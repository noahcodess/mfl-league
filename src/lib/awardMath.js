// The numbers behind the player awards. Every player's season becomes "impact points": what his plays were worth to his
// offense or defense (yards, touchdowns, first-hand efficiency, turnovers, sacks, takeaways), the way football video games
// grade a season. Then each position is measured against a normal starter at that position, so a quarterback isn't
// rewarded just for touching the ball every play and a pass rusher can beat a tackling machine. Pure: the same season
// always gives the same numbers.
const OFF = new Set(['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C']);
const DEF = new Set(['DE', 'DT', 'DL', 'LB', 'CB', 'SS', 'FS']);
export const groupOf = (pos) => (pos === 'QB' ? 'QB' : pos === 'RB' ? 'RB' : pos === 'WR' ? 'WR' : pos === 'TE' ? 'TE' : ['OT', 'OG', 'C'].includes(pos) ? 'OL'
  : ['DE', 'DT', 'DL'].includes(pos) ? 'DL' : pos === 'LB' ? 'LB' : ['CB', 'SS', 'FS'].includes(pos) ? 'DB' : 'ST');
const n = (s, k) => s[k] || 0;

// What a season's offensive plays were worth. s: stat totals (the engine's keys).
export function offensePoints(s, pos) {
  const pass = n(s, 'pyds') * 0.045 + n(s, 'ptd') * 4.5 - n(s, 'int') * 4.5 - n(s, 'sk') * 0.7 + (n(s, 'att') ? (n(s, 'cmp') / n(s, 'att') - 0.62) * n(s, 'att') * 0.8 : 0);
  const rush = n(s, 'ryds') * 0.1 + n(s, 'rtd') * 6 + n(s, 'brk') * 0.3 - n(s, 'fuml') * 4;
  const rec = n(s, 'rec') * 0.4 + n(s, 'recyds') * 0.1 + n(s, 'rectd') * 6 - n(s, 'drops') * 1 + (n(s, 'tgt') ? (n(s, 'rec') / n(s, 'tgt') - 0.65) * n(s, 'tgt') * 0.6 : 0);
  const ret = (n(s, 'kryds') + n(s, 'pryds')) * 0.025 + (n(s, 'krtd') + n(s, 'prtd')) * 6;
  const line = groupOf(pos) === 'OL' ? -n(s, 'sa') * 5 - n(s, 'pa') * 1 : 0;   // a lineman's job shows up as what he didn't allow
  return pass + rush + rec + ret + line;
}

// What a season's defensive plays were worth.
export function defensePoints(s) {
  return n(s, 'tkl') + n(s, 'tfl') * 1.5 + n(s, 'sacks') * 5 + n(s, 'pres') * 1 + n(s, 'pd') * 2.5 + n(s, 'dint') * 7 + n(s, 'intyds') * 0.04
    + n(s, 'ff') * 4 + n(s, 'fr') * 3 + n(s, 'dtd') * 6 - n(s, 'miss') * 0.7 - n(s, 'cmpd') * 0.35;
}

// How much a standout at each position is worth next to the others (tuned on simulated seasons so the winners come out
// like real football: quarterbacks and receivers usually win Offensive Player of the Year, running backs sometimes, tight
// ends rarely; Defensive Player of the Year splits between the pass rushers, the linebackers and the secondary).
export const WEIGHT = { QB: 1.3, RB: 1, WR: 0.98, TE: 0.9, OL: 0.45, DL: 0.98, LB: 1.05, DB: 1.08, ST: 0 };

// Every player's value for a season. players: { id: { pos, games, s } }.
// Returns { id: { group, side, pts, off, def } }: how far above a normal starter at his position he played per game, in
// units of how far the position's best usually are (so every position's standouts land near 1), blended with raw
// production, times the position's weight, and a little less for a player who missed games.
export function seasonValues(players) {
  const rows = Object.entries(players).map(([id, p]) => {
    const g = groupOf(p.pos), side = OFF.has(p.pos) ? 'off' : DEF.has(p.pos) ? 'def' : null;
    const pts = side === 'off' ? offensePoints(p.s || {}, p.pos) : side === 'def' ? defensePoints(p.s || {}) : 0;
    return { id, g, side, pts, games: p.games || 0 };
  });
  const most = Math.max(1, ...rows.map((r) => r.games)), norm = {};
  for (const g of Object.keys(WEIGHT)) {
    const per = rows.filter((r) => r.g === g && r.games >= Math.min(4, most)).map((r) => r.pts / r.games).sort((a, b) => a - b);
    const at = (q) => per[Math.min(per.length - 1, Math.floor(per.length * q))] ?? 0;
    norm[g] = { mid: at(0.5), spread: Math.max(0.5, at(0.95) - at(0.5)) };
  }
  const sideSpread = (side) => { const gs = Object.keys(norm).filter((g) => rows.some((r) => r.g === g && r.side === side)); return gs.reduce((x, g) => x + norm[g].spread, 0) / Math.max(1, gs.length); };
  const wide = { off: sideSpread('off'), def: sideSpread('def') }, out = {};
  rows.forEach((r) => {   // half against his position's standouts, half raw production (so 17 sacks still beats 6 from a tackle)
    const { mid, spread } = norm[r.g], per = r.games ? r.pts / r.games - mid : -spread;
    const z = 0.55 * (per / spread) + 0.45 * (per / (wide[r.side] || spread)), v = z * WEIGHT[r.g] * Math.sqrt(r.games / most) * 100;
    out[r.id] = { group: r.g, side: r.side, pts: r.pts, off: r.side === 'off' ? v : null, def: r.side === 'def' ? v : null };
  });
  return out;
}

// A short line on why he's here, from his numbers.
export function statLine(s = {}, pos) {
  const g = groupOf(pos), x = [];
  if (g === 'QB') x.push(`${n(s, 'pyds')} pass yds`, `${n(s, 'ptd')} TD`, `${n(s, 'int')} INT`);
  if (g === 'QB' && n(s, 'ryds') > 150) x.push(`${n(s, 'ryds')} rush yds`);
  if (g === 'RB') x.push(`${n(s, 'ryds')} rush yds`, `${n(s, 'rtd') + n(s, 'rectd')} TD`, `${n(s, 'recyds')} rec yds`);
  if (g === 'WR' || g === 'TE') x.push(`${n(s, 'rec')} rec`, `${n(s, 'recyds')} yds`, `${n(s, 'rectd')} TD`);
  if (g === 'OL') x.push(`${n(s, 'sa')} sacks allowed`, `${n(s, 'pa')} pressures allowed`);
  if (g === 'DL' || g === 'LB') x.push(`${n(s, 'tkl')} tkl`, `${n(s, 'sacks')} sacks`, n(s, 'tfl') ? `${n(s, 'tfl')} TFL` : `${n(s, 'pres')} pressures`);
  if (g === 'LB' && n(s, 'dint')) x.push(`${n(s, 'dint')} INT`);
  if (g === 'DB') x.push(`${n(s, 'dint')} INT`, `${n(s, 'pd')} PD`, `${n(s, 'tkl')} tkl`);
  return x.join(' · ');
}
