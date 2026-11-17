// The graphics producer: plans every on-screen graphic for a game before it plays, so only one is ever up at a time.
// Before each snap there's one slot over the scorebug, given out in this order: the drive summary (after a touchdown), the
// field goal bar, a player's stat card (after a big play, with cooldowns so it isn't every play or the same guy), then the
// "ball on" tag. Touchdowns and field goals take over the scorebug itself on the scoring play (score).
const KICKS = new Set(['kickoff', 'xp', 'two', 'fg', 'punt', 'kneel', 'spike', 'penalty']);
const MAXED = new Set(['plong', 'reclong', 'rlong', 'fglong']);
const sideOf = (play, id) => (play.stats.some(([pid, k]) => pid === id && ['tkl', 'sacks', 'dint', 'pd', 'tfl', 'ff', 'dtd', 'fr', 'kr', 'krtd', 'kryds', 'pr', 'prtd', 'pryds'].includes(k)) ? play.def : play.off);

function addStats(tot, play) {
  for (const [id, k, n] of play.stats) { const t = (tot[id] ||= {}); t[k] = MAXED.has(k) ? Math.max(t[k] || 0, n) : (t[k] || 0) + n; }
}
const pl = (n, one, many = `${one}S`) => `${n} ${n === 1 ? one : many}`;

// The two short lines a card shows for this kind of player, from his game so far.
export function cardLines(kind, s = {}) {
  if (kind === 'qb') return [`${s.cmp || 0}/${s.att || 0} · ${s.pyds || 0} YDS`, `${s.ptd || 0} TD · ${s.int || 0} INT`];
  if (kind === 'rush') return [`${s.car || 0} CAR · ${s.ryds || 0} YDS`, `${s.car ? (s.ryds / s.car).toFixed(1) : '0.0'} AVG · ${s.rtd || 0} TD`];
  if (kind === 'rec') return [`${s.rec || 0} REC · ${s.recyds || 0} YDS`, `${s.rectd || 0} TD · LONG ${s.reclong || 0}`];
  if (kind === 'ball') return [`${s.dint || 0} INT · ${s.pd || 0} PD`, `${pl(s.tkl || 0, 'TACKLE')}`];
  if (kind === 'rush_d') return [`${pl(s.sacks || 0, 'SACK')} · ${s.tkl || 0} TKL`, `${s.tfl || 0} TFL`];
  return [`${pl(s.tkl || 0, 'TACKLE')}`, `${s.tfl || 0} TFL · ${pl(s.sacks || 0, 'SACK')}`];
}

// Who on this play earned a card, best first: [{ id, kind, big }]. big: worth breaking the cooldowns for.
function candidates(play, tot) {
  const by = (k) => play.stats.filter(([, key]) => key === k).map(([id]) => id), gain = play.result.gain || 0, out = [];
  const [rcv] = by('rec'), [qb] = by('cmp'), [rb] = by('car'), [pick] = by('dint'), [sacker] = by('sacks'), [pd] = by('pd'), tk = by('tkl');
  if (pick) out.push({ id: pick, kind: 'ball', big: true });
  if (sacker && ((tot[sacker]?.sacks || 0) >= 1.5 || (tot[sacker]?.tkl || 0) >= 5)) out.push({ id: sacker, kind: 'rush_d', big: (tot[sacker]?.sacks || 0) >= 2 });
  if (pd && (tot[pd]?.pd || 0) >= 2) out.push({ id: pd, kind: 'ball', big: false });
  if (rcv && gain >= 11) { if ((tot[rcv]?.rec || 0) >= 2 || gain >= 25) out.push({ id: rcv, kind: 'rec', big: gain >= 30 }); if ((tot[qb]?.pyds || 0) >= 120 && (tot[qb]?.att || 0) >= 8) out.push({ id: qb, kind: 'qb', big: false }); }
  if (rb && !rcv && play.kind === 'run' && gain >= 9 && ((tot[rb]?.car || 0) >= 4 || gain >= 25)) out.push({ id: rb, kind: 'rush', big: gain >= 30 });
  tk.forEach((id) => { if ((tot[id]?.tkl || 0) >= 6 && gain <= 3) out.push({ id, kind: 'tackle', big: false }); });
  return out;
}

const scorerOf = (play) => {
  const keys = { rtd: 'RUSHING', rectd: 'RECEIVING', krtd: 'KICK RETURN', prtd: 'PUNT RETURN', dtd: 'DEFENSIVE' };
  for (const [id, k] of play.stats) if (keys[k]) return { id, how: keys[k] };
  const rec = play.stats.find(([, k]) => k === 'rec'), car = play.stats.find(([, k]) => k === 'car');
  return rec ? { id: rec[0], how: 'RECEIVING' } : car ? { id: car[0], how: 'RUSHING' } : null;
};
const yardsFor = (play, id) => { const want = ['ryds', 'recyds', 'kryds', 'pryds', 'intyds']; const s = play.stats.find(([pid, k]) => pid === id && want.includes(k)); return Math.max(1, Math.round(s ? s[2] : play.result.gain || 1)); };

// The drive that ended with this touchdown: plays, yards, time of possession.
function driveOf(plays, n) {
  const td = plays[n], side = td.off, qlen = plays[0].before.clock; let k = n, count = 0, secs = 0;
  const used = (p) => (p.after?.quarter ?? p.before.quarter) === p.before.quarter ? p.before.clock - (p.after?.clock ?? p.before.clock) : p.before.clock + qlen - (p.after?.clock ?? 0);
  while (k >= 0 && plays[k].off === side && !['kickoff', 'punt', 'xp', 'two'].includes(plays[k].kind) && !(k < n && plays[k].result.turnover)) {
    if (['run', 'pass', 'sack', 'kneel', 'spike'].includes(plays[k].kind)) count += 1;
    secs += Math.max(0, used(plays[k])); k -= 1;
  }
  const start = plays[k + 1]?.before.ballOn ?? td.before.ballOn;
  return { side, plays: Math.max(1, count), yards: 100 - start, time: `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}` };
}

// plays: the game's play reports. Returns one entry per play: { pre: graphic | null, score: null | { type: 'td' | 'fg', side,
// ids: [scorer, passer?], how, yards, from, to } } (from/to: that team's points before and after).
export function planGraphics(plays) {
  const tot = {}, seen = {}, out = plays.map(() => ({ pre: null, score: null }));
  let lastCard = -99, lastKind = null, lastTag = -4, owed = null;
  plays.forEach((p, n) => {
    const next = plays[n + 1];
    if (p.result.td && !['xp', 'two'].includes(p.kind)) {
      const sc = scorerOf(p), side = sc && sideOf(p, sc.id), passer = sc?.how === 'RECEIVING' ? p.stats.find(([, k]) => k === 'cmp')?.[0] : null;
      if (sc) out[n].score = { type: 'td', side, ids: [sc.id, passer].filter(Boolean), how: sc.how, yards: yardsFor(p, sc.id), from: p.before.score[side], to: p.after?.score?.[side] ?? p.before.score[side] + 6 };
      if (next && ['xp', 'two'].includes(next.kind) && ['run', 'pass'].includes(p.kind) && !p.result.turnover) out[n + 1].pre = { type: 'drive', ...driveOf(plays, n) };
    }
    const kick = p.kind === 'fg' && p.events.find((e) => e.type === 'kick');
    if (kick?.good) out[n].score = { type: 'fg', side: p.off, ids: [kick.by], how: 'FIELD GOAL', yards: kick.dist, from: p.before.score[p.off], to: p.before.score[p.off] + 3 };
    if (p.kind === 'fg' && !out[n].pre) out[n].pre = { type: 'fg', dist: p.events.find((e) => e.type === 'kick')?.dist, by: p.events.find((e) => e.type === 'kick')?.by };
    if (owed && n - owed.at > 3) owed = null;   // too stale to bother
    if (!out[n].pre && owed && !KICKS.has(p.kind)) { out[n].pre = owed; owed = null; lastCard = n; }   // a card that was waiting on a free slot
    if (!out[n].pre && !KICKS.has(p.kind) && n - lastTag >= 10) { out[n].pre = { type: 'ballOn' }; lastTag = n; }
    addStats(tot, p);
    if (p.result.td || KICKS.has(p.kind)) return;
    if (p.result.gain >= 15) lastTag = Math.min(lastTag, n - 10);   // a big gain earns the "ball on" tag next snap
    const pick = candidates(p, tot).find((c) => (n - (seen[c.id] ?? -99) >= 12) && (n - lastCard >= 4 || (c.big && n - lastCard >= 2)) && (c.kind !== lastKind || c.big));
    if (!pick || !next) return;
    const card = { type: 'card', side: sideOf(p, pick.id), id: pick.id, kind: pick.kind, lines: cardLines(pick.kind, tot[pick.id]) };
    seen[pick.id] = n; lastKind = pick.kind;
    if (!KICKS.has(next.kind) && !out[n + 1].pre) { out[n + 1].pre = card; lastCard = n + 1; } else owed = { ...card, at: n };
  });
  return out;
}
