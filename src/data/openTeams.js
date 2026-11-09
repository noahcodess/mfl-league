// Which teams don't have a coach yet (public), for the "Play MFL" homepage.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

export function useOpenTeams() {
  const [ids, setIds] = useState(null);
  useEffect(() => {
    if (DEMO) { setIds(['crf', 'ddc', 'dst', 'edc', 'flf', 'lsc', 'ntw', 'ocm', 'ocn', 'pln', 'tga', 'void', 'wrf', 'wsl', 'drf']); return; }
    db.rpc('open_team_ids').then(({ data, error }) => setIds(error ? [] : (data || []).map((r) => (typeof r === 'string' ? r : r.open_team_ids))));
  }, []);
  return ids;
}
