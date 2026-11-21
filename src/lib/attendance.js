// How full the stadium is for a game, from the home team's fan support plus the occasion. Kept simple on purpose: fan
// support does most of the work. Floors: a rivalry draws at least ~47%, a special event (a whiteout-style alternate with the
// fans dressed) ~58%, primetime ~75%, a playoff game ~85%, and a rivalry special event ~86%. Each occasion also adds a bump.
// Anything that reaches 95% is a sellout: nobody leaves a few hundred seats empty, so 94% is the most a game can show unsold.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (n) => { let x = (Number(n) || 1) * 2654435761 % 4294967296; x ^= x >>> 13; x = x * 1274126177 % 4294967296; return (x >>> 0) / 4294967296; };

// o: { fan (home fan support 1-100), oppFan, capacity, rivalry, special (fans dressed for an alternate), alternate (any
// specialty jersey), prime, playoff, final (the Craft Bowl), gameId }. Returns { count, pct (0-1), soldOut, why }.
export function gameAttendance(o) {
  const f = clamp((o.fan ?? 50) / 100, 0.01, 1), opp = clamp((o.oppFan ?? 50) / 100, 0, 1);
  let pct = 0.2 + 0.8 * f ** 0.8;                                  // 1% fan support → about 20% full
  pct += (opp - 0.5) * 0.12;                                        // a good opponent draws a few more
  pct += (hash(o.gameId) - 0.5) * 0.07;                             // every game is a little different
  const floors = [], bump = (on, add, floor, why) => { if (!on) return; pct += add; floors.push([floor, why]); };
  bump(o.rivalry, 0.06, 0.47, 'Rivalry');
  bump(o.special, 0.09, 0.58, 'Special event');
  bump(o.alternate && !o.special, 0.03, 0, 'Alternate jerseys');
  bump(o.prime, 0.12, 0.75, 'Primetime');
  bump(o.playoff, 0.2, 0.85, 'Playoffs');
  if (o.rivalry && o.special) floors.push([0.86, 'Rivalry special event']);
  floors.forEach(([fl]) => { pct = Math.max(pct, fl + hash((o.gameId || 1) * 7) * 0.03); });
  if (o.final) pct = 1;
  const soldOut = pct >= 0.95;
  pct = soldOut ? 1 : clamp(pct, 0.2, 0.94);
  const cap = o.capacity || 60000, count = soldOut ? cap : Math.round(cap * pct / 10) * 10;
  return { count, pct: count / cap, soldOut, why: floors.map(([, w]) => w) };
}
