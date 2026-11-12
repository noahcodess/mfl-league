// A made-up but believable season for the Live tab and League leaders until the game engine is built: a 12-week schedule
// (every week 8 games in TV windows), scores for the weeks already "played", one game in progress, player stat lines from the
// real rosters (better players put up better numbers), and standings. Same output shape the real games will use later.
import { PRIME_PLAN } from '../data/games.js';

export const SAMPLE_WEEK = 6;
const WEEKS = 12;
const SLOT_TIME = { thu_night: 'Thu 8:15 PM', sat_night: 'Sat 8:15 PM', sun_night: 'Sun 8:20 PM', mon_night: 'Mon 8:15 PM' };
const DAY_TIMES = { sat_day: ['Sat 1:00 PM', 'Sat 4:25 PM'], sun_day: ['Sun 1:00 PM', 'Sun 4:25 PM'] };
const AIR = ['thu_night', 'sat_day', 'sat_night', 'sun_day', 'sun_night', 'mon_night'];

function rand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Circle method: every team plays once a week, no repeats in 12 weeks.
function pairings(ids, r) {
  const t = [...ids].sort(() => r() - 0.5), rounds = [];
  for (let w = 0; w < WEEKS; w++) {
    const games = [];
    for (let i = 0; i < t.length / 2; i++) { const a = t[i], b = t[t.length - 1 - i]; games.push((w + i) % 2 ? [a, b] : [b, a]); }
    rounds.push(games);
    t.splice(1, 0, t.pop());
  }
  return rounds;
}

const starter = (ps, pos, n = 0) => ps.filter((p) => p.position === pos).sort((a, b) => (a.depth === 'starter' ? -1 : 1) - (b.depth === 'starter' ? -1 : 1) || b.stars - a.stars)[n];

// One team's box score for one game.
function teamLines(ps, tds, oppInts, r) {
  const qb = starter(ps, 'QB'), rb = starter(ps, 'RB'), rec = [starter(ps, 'WR'), starter(ps, 'WR', 1), starter(ps, 'TE')].filter(Boolean);
  const out = [], line = (p, o) => p && out.push({ id: p.id, ...o });
  const passTD = Math.min(tds, Math.round(tds * (0.45 + r() * 0.3))), rushTD = tds - passTD;
  const passYds = Math.round(150 + (qb?.stars || 3) * 26 + (r() - 0.4) * 90 + passTD * 12);
  line(qb, { passYds, passTD, int: oppInts, comp: Math.round(passYds / 11.5), att: Math.round(passYds / 7.3) });
  line(rb, { rushYds: Math.round(35 + (rb?.stars || 3) * 14 + (r() - 0.3) * 55), rushTD });
  const share = [0.42, 0.3, 0.28].map((s) => s * (0.75 + r() * 0.5)), tot = share.reduce((a, b) => a + b, 0);
  let tdLeft = passTD;
  rec.forEach((p, i) => { const yds = Math.round(passYds * share[i] / tot), td = i === rec.length - 1 ? tdLeft : Math.min(tdLeft, r() < 0.5 ? 1 : 0); tdLeft -= td; line(p, { rec: Math.max(1, Math.round(yds / 12.5)), recYds: yds, recTD: td }); });
  return out;
}

function defense(ps, sacks, ints, r) {
  const rush = ['DE', 'DL', 'DT', 'LB'].flatMap((pos) => ps.filter((p) => p.position === pos && p.depth === 'starter'));
  const cover = ['CB', 'SS', 'FS', 'LB'].flatMap((pos) => ps.filter((p) => p.position === pos && p.depth === 'starter'));
  const m = new Map(), add = (p, k) => { if (!p) return; const o = m.get(p.id) || { id: p.id, sacks: 0, defInt: 0 }; o[k] += 1; m.set(p.id, o); };
  const pick = (list) => list.sort((a, b) => b.stars - a.stars)[Math.floor(r() * r() * list.length)];
  for (let i = 0; i < sacks; i++) add(pick(rush), 'sacks');
  for (let i = 0; i < ints; i++) add(pick(cover), 'defInt');
  return [...m.values()];
}

function score(r, mine, theirs, home) {
  const edge = (mine - theirs) * 0.55 + (home ? 0.25 : 0);
  const tds = Math.max(0, Math.round(2.5 + edge + (r() - 0.5) * 2.6)), fgs = Math.floor(r() * 3);
  return { tds, pts: tds * 7 + fgs * 3 };
}

// teams: [{ id, name, conference, overall: { stars } }]. players(teamId) → roster.
export function sampleSeason(teams, players, seed = 2026) {
  const r = rand(seed), byId = Object.fromEntries(teams.map((t) => [t.id, t])), stars = (id) => byId[id]?.overall?.stars || 3;
  const rosters = Object.fromEntries(teams.map((t) => [t.id, players(t.id).filter((p) => p.status !== 'retired')]));
  const weeks = pairings(teams.map((t) => t.id), r).map((pairs, wi) => {
    const week = wi + 1;
    const ranked = [...pairs].sort((a, b) => stars(b[0]) + stars(b[1]) - (stars(a[0]) + stars(a[1])));
    const used = { sat_day: 0, sun_day: 0 };
    const games = ranked.map(([home, away], i) => {
      const win = PRIME_PLAN[i], time = SLOT_TIME[win] || DAY_TIMES[win][used[win]++];
      return { id: `w${week}-${home}`, week, home, away, window: win, time, status: 'upcoming' };
    }).sort((a, b) => AIR.indexOf(a.window) - AIR.indexOf(b.window) || a.time.localeCompare(b.time));
    games.forEach((g, i) => {
      const h = score(r, stars(g.home), stars(g.away), true), a = score(r, stars(g.away), stars(g.home), false);
      if (h.pts === a.pts) (r() < 0.55 ? h : a).pts += 3; // overtime field goal
      const played = week < SAMPLE_WEEK || (week === SAMPLE_WEEK && i < 2), live = week === SAMPLE_WEEK && i === 2;
      if (!played && !live) return;
      const iH = Math.floor(r() * r() * 3), iA = Math.floor(r() * r() * 3), sH = Math.floor(r() * 5), sA = Math.floor(r() * 5);
      const part = live ? 0.62 : 1, cut = (n) => Math.round(n * part);
      g.status = live ? 'live' : 'final'; g.clock = live ? 'Q3 6:41' : null;
      g.homeScore = live ? cut(h.pts) - (cut(h.pts) % 7 === 1 ? 1 : 0) : h.pts; g.awayScore = live ? cut(a.pts) - (cut(a.pts) % 7 === 1 ? 1 : 0) : a.pts;
      g.lines = [...teamLines(rosters[g.home], live ? Math.round(h.tds * part) : h.tds, iA, r), ...teamLines(rosters[g.away], live ? Math.round(a.tds * part) : a.tds, iH, r),
        ...defense(rosters[g.home], sA, iH, r), ...defense(rosters[g.away], sH, iA, r)].map((l) => ({ ...l, team: rosters[g.home].some((p) => p.id === l.id) ? g.home : g.away }));
    });
    return { week, games };
  });
  return { sample: true, current: SAMPLE_WEEK, weeks };
}
