// Draft night trade wire: offers sent (teams only, never what's in them) and trades that went through, newest first.
// Read every 4 seconds while the draft is on so every screen gets the breaking news.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const demoWire = () => {
  const t = Date.now();
  return [
    { trade_id: 2, kind: 'offer', from_team: 'snm', to_team: 'ddc', at: new Date(t).toISOString() },
    { trade_id: 1, kind: 'accepted', from_team: 'void', to_team: 'drf', at: new Date(t - 9 * 60e3).toISOString(), from_gets: 'Season 8 round 1 pick (DRF)', to_gets: 'Season 8 round 2 pick (VOID), Season 9 round 1 pick (VOID)' },
    { trade_id: 1, kind: 'offer', from_team: 'void', to_team: 'drf', at: new Date(t - 14 * 60e3).toISOString() },
  ];
};

export function useTradeWire(season, active) {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!active) { setList([]); return undefined; }
    if (DEMO) { const id = setTimeout(() => setList(demoWire()), 2500); return () => clearTimeout(id); }
    let live = true; let timer;
    const load = async () => {
      const { data } = await db.rpc('draft_trade_wire', { p_season: season });
      if (!live) return;
      setList(data || []);
      timer = setTimeout(load, 4000);
    };
    load();
    return () => { live = false; clearTimeout(timer); };
  }, [season, active]);
  return list;
}

export const wireKey = (w) => `${w.trade_id}-${w.kind}`;
