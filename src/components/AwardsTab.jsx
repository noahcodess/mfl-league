// The Commissioner's Desk Awards tab: every award's top 5 as the numbers have it (awardRank), which he can reorder, cut and
// add to; only each list's top 3 are finalists. Plus how long last season's awards stay on the League tab. The numbers'
// lists save themselves until he edits one; after that his order stands until he hits "Use the numbers".
import React, { useEffect, useState } from 'react';
import AwardList from './AwardList.jsx';
import CeremonyDesk from './CeremonyDesk.jsx';
import { AWARDS } from '../lib/awardRank.js';
import { statLine, groupOf } from '../lib/awardMath.js';
import { computeAwards, savedAwards, saveAward, setAwardsUntil, coachEntry } from '../data/awards.js';
import { useCeremony, ceremonyTime } from '../data/ceremony.js';
import { useSeasonGames } from '../data/games.js';
import { currentSeason, currentWeek, awardsUntil, getTeams } from '../data/teams.js';

const UNTIL = [[-1, "Don't display awards"], ...Array.from({ length: 11 }, (_, w) => [w, `Through the end of Week ${w}`])];

const OFF_G = new Set(['QB', 'RB', 'WR', 'TE', 'OL']), DEF_G = new Set(['DL', 'LB', 'DB']);
const POOL = { oroy: 'orookie', droy: 'drookie', cpoy: 'vets' };   // who can be added to each award by hand

function pools(inp, coaches) {
  const name = (id) => getTeams().find((t) => t.id === id)?.name || id;
  const players = Object.entries(inp.players).filter(([, p]) => p.games > 0).sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([id, p]) => ({ id, rookie: p.rookie, label: `${p.name} · ${p.pos} · ${name(p.team)}`, entry: { id, name: p.name, team: p.team, pos: p.pos, line: statLine(p.s, p.pos), score: null } }));
  return {
    player: players, vets: players.filter((p) => !p.rookie),
    orookie: players.filter((p) => p.rookie && OFF_G.has(groupOf(p.entry.pos))), drookie: players.filter((p) => p.rookie && DEF_G.has(groupOf(p.entry.pos))),
    team: getTeams().map((t) => ({ id: t.id, label: t.name, entry: { id: t.id, ...coachEntry(t.id, coaches, name), line: '', score: null } })),
    game: [...inp.games].sort((a, b) => a.week - b.week).map((g) => ({ id: String(g.id), label: `Week ${g.week}: ${name(g.away)} ${g.as} at ${name(g.home)} ${g.hs}`, entry: { id: String(g.id), name: `${name(g.away)} at ${name(g.home)}`, line: `Week ${g.week} · ${g.as}-${g.hs}`, score: null } })),
  };
}

export default function AwardsTab({ canControl }) {
  const [season, setSeason] = useState(currentSeason()), [data, setData] = useState(null), [err, setErr] = useState(''), [until, setUntil] = useState(awardsUntil());
  const [cv, setCv] = useState(0), cer = useCeremony(season, cv), games = useSeasonGames(season), locked = !!cer?.locked;
  const load = async (keep = locked) => {
    setData(null); setErr('');
    try {
      const [calc, saved] = await Promise.all([computeAwards(season), savedAwards(season)]);
      if (!calc) return setData({ lists: {}, edited: {}, pool: null });
      const lists = {}, edited = {};
      for (const a of AWARDS) {
        const s = saved[a.key], mine = calc.lists[a.key];
        if (s?.edited || (keep && s)) { lists[a.key] = s.entries; edited[a.key] = !!s.edited; } else {   // once confirmed, the saved lists are the lists
          lists[a.key] = mine;
          if (canControl && !keep && JSON.stringify(s?.entries || []) !== JSON.stringify(mine)) saveAward(season, a.key, mine, false).catch(() => {});   // the numbers' list keeps itself current
        }
      }
      setData({ lists, edited, pool: pools(calc.inputs, calc.coaches || {}), calc: calc.lists });
    } catch (e) { setErr(e.message || String(e)); }
  };
  useEffect(() => { if (cer) load(); }, [season, !!cer]); // eslint-disable-line react-hooks/exhaustive-deps   (waits for the ceremony: locked lists never re-save)
  const change = (key, list, ed) => { setData((d) => ({ ...d, lists: { ...d.lists, [key]: list }, edited: { ...d.edited, [key]: ed } })); saveAward(season, key, list, ed).catch((e) => setErr(e.message)); };
  const poolFor = (a) => (!data?.pool ? [] : POOL[a.key] ? data.pool[POOL[a.key]] : a.kind === 'team' ? data.pool.team : a.kind === 'game' ? data.pool.game : data.pool.player);
  return (
    <div className="aw-tab">
      <div className="aw-bar">
        <label>Season <select value={season} onChange={(e) => setSeason(Number(e.target.value))}>{Array.from({ length: currentSeason() }, (_, k) => currentSeason() - k).map((s) => <option key={s} value={s}>Season {s}</option>)}</select></label>
        <label>Show last season's awards on the League tab <select value={until} disabled={!canControl} onChange={(e) => { const w = Number(e.target.value); setUntil(w); setAwardsUntil(w).catch((x) => setErr(x.message)); }}>{UNTIL.map(([w, t]) => <option key={w} value={w}>{t}</option>)}</select></label>
        <button className="btn small ghost" onClick={() => load()}>↻ Recalculate</button>
      </div>
      <p className="dim aw-intro">The numbers rank a top 5 for each award; the top 3 are the finalists (shaded), and only they are ever shown. Drag rows (or use ▲▼) to reorder; to bring someone else in, 🔄 Replace #4 or #5. Tap ❓ for how each one is calculated.</p>
      {data?.pool && <CeremonyDesk season={season} state={cer} lists={data.lists} canControl={canControl} reload={async () => setCv((n) => n + 1)}
        due={season === currentSeason() && ceremonyTime(games, null, currentWeek())} />}
      {err && <p className="error">{err}</p>}
      {!data ? <p className="dim">Crunching the season...</p> : !data.pool ? <p className="dim">Awards need the live league (not the demo).</p> : (
        <div className="aw-grid">
          {AWARDS.map((a) => <AwardList key={a.key} award={a} list={data.lists[a.key] || []} edited={!!data.edited[a.key]} pool={poolFor(a)} canEdit={canControl} locked={locked} done={!!cer?.started}
            onChange={(list, ed) => change(a.key, list, ed)} onReset={() => change(a.key, data.calc[a.key], false)} />)}
        </div>
      )}
    </div>
  );
}
