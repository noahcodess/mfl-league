// Which teams have a coach login (everyone else is run by the computer).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

export function useCoachedTeams() {
  const [ids, setIds] = useState([]);
  useEffect(() => {
    let live = true;
    if (DEMO) { setIds(['snm', 'crf']); return undefined; }
    db.rpc('coached_teams').then(({ data }) => { if (live) setIds(data || []); });
    return () => { live = false; };
  }, []);
  return ids;
}
