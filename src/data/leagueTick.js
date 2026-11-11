// Every open copy of the site nudges the server about twice a minute: dates set to auto-run fire on their countdown,
// and bot coaches answer trades that are due. Reloads the league when something actually ran.
import { useEffect } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

export function useLeagueTick(onChange) {
  useEffect(() => {
    if (DEMO) return undefined;
    const tick = () => db.rpc('league_tick').then(({ data }) => { if (data?.auto > 0) onChange?.(); }, () => {});
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);
}
