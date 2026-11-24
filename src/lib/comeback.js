// Comeback Player of the Year. A comeback needs a real dip before it: last season he was hurt for a long stretch, or
// benched after starting before, or out of the league after starting before, or a good starter who had a clearly bad
// year. Never a rookie, never a player whose first starting season is this one, and he has to be a real, productive
// starter now. The score weighs how deep the dip was, how good he is now and how far he climbed, with a little for
// his team winning. Pure.
//
// hist[id]: { rookieSeason, seasons: { [s]: { games, G, val } } (seasons played on the site: games, team games, impact
// vs a normal starter), injured: { [s]: weeks missed }, roles: { [s]: 'starter' | 'backup' } (his contract that season),
// signed: { [s]: true } (under contract that season), known: { [s]: true } (seasons the site has stats for) }.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// Was he a starter in season s? true / false / 'none' (no team) / null (no way to know).
export function starterIn(h, s) {
  const st = h.seasons?.[s];
  if (st && st.G) return st.games / st.G >= 0.5;
  if (h.known?.[s]) return h.signed?.[s] ? false : 'none';   // a season the site has stats for: signed but never played = benched
  if (h.roles?.[s]) return h.roles[s] === 'starter';
  if (h.signed && Object.keys(h.signed).length && !h.signed[s] && h.rookieSeason != null && h.rookieSeason <= s) return 'none';
  return null;
}

// The best story for player id, or null. cur: his impact this season (z). games / G: games played / team games.
export function comebackCase(S, h, cur, games, G) {
  if (!h || h.rookieSeason == null || h.rookieSeason >= S) return null;   // rookies never
  if (games / G < 0.6 || cur < 0.25) return null;   // a real, productive starter this season
  const prev = h.seasons?.[S - 1], role1 = starterIn(h, S - 1), earlier = [];
  for (let s = S - 2; s >= (h.rookieSeason ?? S - 6); s--) if (starterIn(h, s) === true) earlier.push(s);
  const cases = [];
  const inj = h.injured?.[S - 1] || 0, missed = prev ? Math.max(inj / prev.G, 1 - prev.games / prev.G) : inj / 12;
  const startedHealthy = h.roles?.[S - 1] === 'starter' || (prev && prev.games >= 0.6 * Math.max(1, prev.G - inj));   // he was the starter when healthy
  if (startedHealthy && inj >= 3 && missed >= 0.3)   // hurt for a long stretch
    cases.push({ kind: 'injury', dip: clamp(missed * 1.25), was: prev ? prev.val * (1 - missed) : -0.4, why: `Missed ${inj} week${inj === 1 ? '' : 's'} hurt last season` });
  if (h.rookieSeason <= S - 2 && earlier.length && (role1 === false || role1 === 'none') && inj < 3)   // benched or out of the league, after starting before
    cases.push(role1 === 'none' ? { kind: 'return', dip: 0.95, was: -0.6, why: 'Out of the league last season' } : { kind: 'benched', dip: 0.9, was: prev ? prev.val * 0.5 : -0.4, why: 'A backup last season' });
  if (role1 === true && prev && inj < 3) {   // a good starter's bad year
    const best = Math.max(...earlier.map((s) => h.seasons?.[s]?.val ?? -9), -9);
    if (best >= 0.35 && prev.val <= best - 1 && prev.val <= 0) cases.push({ kind: 'slump', dip: clamp((best - prev.val) / 2), was: prev.val, why: 'A down year last season' });
  }
  if (!cases.length) return null;
  const c = cases.sort((a, b) => b.dip - a.dip)[0], climb = cur - c.was;
  return climb >= 0.5 ? { ...c, climb } : null;
}

const KIND = { injury: 1.1, return: 1, benched: 1, slump: 0.8 };
// The comeback score (higher is better) for a story c, his impact now (cur) and his team's win share.
export const comebackScore = (c, cur, win) => c.dip * (cur + 0.6) * KIND[c.kind] * (0.85 + 0.3 * win) * (1 + Math.min(0.5, c.climb * 0.15));
