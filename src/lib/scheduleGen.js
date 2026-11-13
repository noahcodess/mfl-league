// Season schedule generator. 16 teams in 2 conferences of 8, 12 weeks, every team plays once a week:
// - 7 conference games (everyone in your conference once) and 5 against the other conference
// - exactly 6 home and 6 away
// - teams with a better win % last season lean toward playing each other across conferences (a slight lean, not a lock)
// - rivalries are never forced: the schedule ignores them (they only make better primetime games and get a badge).
//   makeSchedule can still take a rivals list, but the league passes none.
// Returns [{ week, home, away, conference }]. checkSchedule() lists anything that breaks the rules (empty = good).

const shuffle = (arr, rng) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Circle method: n-1 rounds, each a set of n/2 pairs, everyone once per round.
function roundRobin(ids, rng) {
  let arr = shuffle(ids, rng);
  const n = arr.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r += 1) {
    rounds.push(Array.from({ length: n / 2 }, (_, i) => [arr[i], arr[n - 1 - i]]));
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return rounds;
}

// 5 rounds of cross-conference games. Built from shifted pairings (always valid), scored by how close the teams' records
// are, then picked at random from the better-matched quarter. That's the "slight" lean toward good-vs-good.
// Rival pairs from opposite conferences are all but required: a candidate missing one is pushed to the bottom.
function crossRounds(A, B, rank, rng, rivals = [], tries = 2500) {
  const cands = [];
  for (let t = 0; t < tries; t += 1) {
    const a = shuffle(A, rng);
    const b = shuffle(B, rng);
    const shifts = shuffle([0, 1, 2, 3, 4, 5, 6, 7], rng).slice(0, 5);
    const rounds = shifts.map((s) => a.map((x, i) => [x, b[(i + s) % 8]]));
    const has = new Set(rounds.flat().map(([x, y]) => [x, y].sort().join('-')));
    const missing = rivals.filter((r) => !has.has([...r].sort().join('-'))).length;
    const score = rounds.flat().reduce((sum, [x, y]) => sum + Math.abs(rank[x] - rank[y]), 0) + missing * 1000;
    cands.push({ rounds, score });
  }
  cands.sort((x, y) => x.score - y.score);
  const best = cands[0].score;
  const pool = cands.slice(0, Math.ceil(cands.length / 4)).filter((c) => c.score < Math.floor(best / 1000) * 1000 + 1000);
  return pool[Math.floor(rng() * pool.length)].rounds;
}

// Home/away: walk an Euler circuit (every team has 12 games, an even number) and make the team you leave from the home
// team. Every team is left as often as it's entered, so everyone gets exactly 6 home and 6 away.
function orient(edges, ids, rng) {
  const adj = Object.fromEntries(ids.map((id) => [id, []]));
  edges.forEach((e, i) => { adj[e.a].push(i); adj[e.b].push(i); });
  ids.forEach((id) => { adj[id] = shuffle(adj[id], rng); });
  const used = new Array(edges.length).fill(false);
  const stack = [[ids[0], -1]];
  while (stack.length) {
    const [v] = stack[stack.length - 1];
    while (adj[v].length && used[adj[v][adj[v].length - 1]]) adj[v].pop();
    if (!adj[v].length) { stack.pop(); continue; }
    const i = adj[v].pop();
    used[i] = true;
    const e = edges[i];
    const w = e.a === v ? e.b : e.a;
    e.home = v; e.away = w;
    stack.push([w, i]);
  }
}

// teams: [{ id, conference }], winPct: { teamId: 0..1 } from last season (missing = .500), rivals: [[a, b], ...].
export function makeSchedule(teams, winPct = {}, rng = Math.random, rivals = []) {
  const confs = [...new Set(teams.map((t) => t.conference))].sort();
  if (confs.length !== 2) throw new Error('The schedule needs exactly 2 conferences');
  const [A, B] = confs.map((c) => teams.filter((t) => t.conference === c).map((t) => t.id));
  if (A.length !== 8 || B.length !== 8) throw new Error('Each conference needs exactly 8 teams');
  const rank = {};
  [A, B].forEach((conf) => shuffle(conf, rng).sort((x, y) => (winPct[y] ?? 0.5) - (winPct[x] ?? 0.5)).forEach((id, i) => { rank[id] = i; }));

  const rrA = roundRobin(A, rng);
  const rrB = roundRobin(B, rng);
  const confWeeks = rrA.map((r, i) => [...r, ...rrB[i]]);
  const cross = rivals.filter(([x, y]) => A.includes(x) !== A.includes(y));
  const xWeeks = crossRounds(A, B, rank, rng, cross);

  // Mix the 5 cross-conference weeks in among the 7 conference weeks (never 3 in a row).
  let order;
  do order = shuffle([...Array(7).fill('C'), ...Array(5).fill('X')], rng); while (/XXX|CCCC/.test(order.join('')));
  let ci = 0; let xi = 0;
  const edges = [];
  order.forEach((kind, w) => {
    const wk = kind === 'C' ? confWeeks[ci++] : xWeeks[xi++];
    wk.forEach(([a, b]) => edges.push({ week: w + 1, a, b, conference: kind === 'C' }));
  });
  orient(edges, [...A, ...B], rng);
  return edges.map((e) => ({ week: e.week, home: e.home, away: e.away, conference: e.conference })).sort((x, y) => x.week - y.week);
}

// Everything wrong with a schedule (empty list = it follows every rule).
export function checkSchedule(games, teams) {
  const out = [];
  const conf = Object.fromEntries(teams.map((t) => [t.id, t.conference]));
  const pairs = new Set();
  teams.forEach((t) => {
    const mine = games.filter((g) => g.home === t.id || g.away === t.id);
    const home = mine.filter((g) => g.home === t.id).length;
    const inConf = mine.filter((g) => conf[g.home] === conf[g.away]).length;
    if (mine.length !== 12) out.push(`${t.id} has ${mine.length} games`);
    if (home !== 6) out.push(`${t.id} has ${home} home games`);
    if (inConf !== 7) out.push(`${t.id} has ${inConf} conference games`);
    for (let w = 1; w <= 12; w += 1) if (mine.filter((g) => g.week === w).length !== 1) out.push(`${t.id} doesn't play exactly once in week ${w}`);
  });
  games.forEach((g) => { const k = [g.home, g.away].sort().join('-'); if (pairs.has(k)) out.push(`${k} play twice`); pairs.add(k); });
  return out;
}
