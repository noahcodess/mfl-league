// Every team's stadium: its name and capacity (attendance and stadium pulse will build on this), plus the commissioner's edits.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const DEFAULTS = {
  crf: ['The Crimson Crown', 92000], snm: ['Death Valley', 85000], void: ['The Abyss', 78500], ntw: ['The Bone Yard', 76000],
  ddc: ["The Warden's Den", 72500], edc: ['Purpur Park', 70000], lsc: ['The Grotto', 68000], tga: ['Spruce Hollow', 66500],
  ocm: ['Prismarine Stadium', 65000], wrf: ['Warped Field', 63500], drf: ['The Crypt', 62000], pln: ['The Pigpen', 61000],
  wsl: ['Phantom Field', 60000], ocn: ['Riptide Stadium', 59500], flf: ['Iron Garden', 58500], dst: ['The Web', 57000],
};
const fallback = () => Object.fromEntries(Object.entries(DEFAULTS).map(([id, [name, capacity]]) => [id, { teamId: id, name, capacity }]));
export const capacityText = (n) => Number(n).toLocaleString('en-US');

let cache = null;
const subs = new Set();
async function load() {
  const map = fallback();
  if (!DEMO) {
    const { data } = await db.from('stadiums').select('*');
    (data || []).forEach((r) => { map[r.team_id] = { teamId: r.team_id, name: r.name, capacity: r.capacity }; });
  }
  cache = map;
  subs.forEach((fn) => fn(map));
}

// All stadiums by team id. Loaded once and shared; reloads after an edit.
export function useStadiums() {
  const [map, setMap] = useState(cache || fallback());
  useEffect(() => {
    subs.add(setMap);
    if (cache) setMap(cache); else load();
    return () => subs.delete(setMap);
  }, []);
  return map;
}

export async function saveStadium(teamId, name, capacity) {
  if (DEMO) return;
  const { error } = await db.rpc('commish_set_stadium', { p_team: teamId, p_name: name, p_capacity: Number(capacity) });
  if (error) throw new Error(error.message.includes('not allowed') ? 'Only the commissioner can do this.' : error.message.replace(/^.*?ERROR:\s*/, ''));
  await load();
}
