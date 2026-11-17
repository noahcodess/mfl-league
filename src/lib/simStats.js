// Adds a game's play reports up into box-score numbers: one line of stats per player and one per team.
export const LONGS = new Set(['rlong', 'plong', 'reclong', 'fglong']);

// plays: the game's reports. Returns { players: { id: { att, cmp, ... } }, teams: { home: {...}, away: {...} } }.
export function tally(plays) {
  const players = {}, blank = () => ({ plays: 0, yds: 0, pyds: 0, ryds: 0, fd: 0, third: [0, 0], fourth: [0, 0], tov: 0, sacked: 0, top: 0, big: 0, drives: 0 }), teams = { home: blank(), away: blank() };
  plays.forEach((p) => {
    (p.stats || []).forEach(([id, key, n]) => { const row = (players[id] ||= {}); row[key] = LONGS.has(key) ? Math.max(row[key] || 0, n) : (row[key] || 0) + n; });
    const t = teams[p.off], scrim = ['run', 'pass', 'sack'].includes(p.kind) && !p.noStats;
    t.top += p.clock.seconds || 0;
    if (!scrim) return;
    t.plays += 1; t.yds += p.result.gain; if (p.kind === 'run') t.ryds += p.result.gain; else t.pyds += p.result.gain;
    if (p.result.firstDown) t.fd += 1; if (p.result.turnover === 'int' || p.result.turnover === 'fumble') t.tov += 1;
    if (p.kind === 'sack') t.sacked += 1; if (p.result.gain >= 20) t.big += 1;
    if (p.before.down === 3) { t.third[1] += 1; if (p.result.firstDown || p.result.td) t.third[0] += 1; }
    if (p.before.down === 4) { t.fourth[1] += 1; if (p.result.firstDown || p.result.td) t.fourth[0] += 1; }
  });
  return { players, teams };
}
