// Birthday & Farewell for one season: when it ran, whether it ran on its countdown, and everyone who retired
// (with what the portraits need), best players first.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { toPlayer } from './loadLeague.js';
import { getAllPlayers } from './players.js';

const demo = () => ({
  at: new Date().toISOString(), auto: true,
  retired: getAllPlayers().filter((p) => p.teamId && p.age >= 27).sort((a, b) => b.stars - a.stars).slice(0, 40)
    .map((p) => ({ ...p, lastTeamId: p.teamId, retiredAge: p.age })),
});

// Null while loading; { at: null } if it hasn't run this season.
export function useFarewell(season, version = 0) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO) { setData(new URLSearchParams(window.location.search).get('bday') ? demo() : { at: null, retired: [] }); return undefined; }
    (async () => {
      const [bday, sched, evs] = await Promise.all([
        db.from('league_events').select('created_at').eq('kind', 'birthday').eq('season', season).order('id', { ascending: false }).limit(1).maybeSingle(),
        db.from('league_schedule').select('auto_ran_at').eq('season', season).eq('kind', 'birthday').maybeSingle(),
        db.from('league_events').select('player_id, team_id, data').eq('kind', 'retired').eq('season', season),
      ]);
      const rows = evs.data || [];
      const ids = rows.map((r) => r.player_id).filter(Boolean);
      const { data: players } = ids.length ? await db.from('players').select('*').in('id', ids) : { data: [] };
      const byId = Object.fromEntries((players || []).map((p) => [p.id, toPlayer(p)]));
      const retired = rows.filter((r) => byId[r.player_id])
        .map((r) => ({ ...byId[r.player_id], lastTeamId: r.team_id, retiredAge: r.data?.age ?? byId[r.player_id].age }))
        .sort((a, b) => (b.stars || 0) - (a.stars || 0) || a.name.localeCompare(b.name));
      if (live) setData({ at: bday.data?.created_at || null, auto: !!sched.data?.auto_ran_at, retired });
    })();
    return () => { live = false; };
  }, [season, version]);
  return data;
}
