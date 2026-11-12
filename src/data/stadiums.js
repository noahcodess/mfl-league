// Every team's stadium: name, capacity (attendance and stadium pulse will build on this), end zone font, background and shadow, stands style,
// plus the commissioner's edits.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const DEFAULTS = {
  crf: ['The Crimson Crown', 97000, '3d', 'chevron'], snm: ['Death Valley', 89000, 'bold', 'diagonal'], void: ['The Event Horizon', 80000, 'outline', 'checker'],
  ntw: ['The Bone Yard', 76000, 'italic', 'stripes'], ddc: ['Bounce House', 72500, 'tall', 'border'], ocn: ['Riptide Stadium', 71000, 'italic', 'fade'],
  edc: ['Purpur Park', 70000, 'future', 'fade'], lsc: ['The Grotto', 68000, 'outline', 'stripes'], tga: ['The Timberyard', 66500, 'block', 'solid', 'spruce'],
  ocm: ['Prismarine Stadium', 65000, 'tall', 'stripes'], wrf: ['Warped Field', 63500, 'outline', 'diagonal'], pln: ['The Pigpen', 60500, 'bold', 'checker'],
  wsl: ['Phantom Field', 60000, '3d', 'border'], drf: ['The Crypt', 59000, 'italic', 'border'], flf: ['Iron Garden', 58500, 'golem', 'solid'],
  dst: ['The Web', 57000, 'bold', 'chevron'],
};
const fallback = () => Object.fromEntries(Object.entries(DEFAULTS).map(([id, [name, capacity, font, design, style = 'standard']]) => [id, { teamId: id, name, capacity, font, design, style, shadow: 'drop', shadowColor: 'dark' }]));
export const STAND_STYLES = [['standard', 'Standard'], ['spruce', 'Spruce wood']];
export const capacityText = (n) => Number(n).toLocaleString('en-US');

let cache = null;
const subs = new Set();
export async function reloadStadiums() { return load(); }
async function load() {
  const map = fallback();
  if (!DEMO) {
    const { data } = await db.from('stadiums').select('*');
    (data || []).forEach((r) => { map[r.team_id] = { teamId: r.team_id, name: r.name, capacity: r.capacity, font: r.endzone_font, design: r.endzone_design, style: r.stand_style, shadow: r.endzone_shadow, shadowColor: r.endzone_shadow_color }; });
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

export async function saveStadium(teamId, st) {
  if (DEMO) return;
  const { error } = await db.rpc('commish_set_stadium', { p_team: teamId, p_name: st.name, p_capacity: Number(st.capacity), p_font: st.font, p_design: st.design, p_style: st.style, p_shadow: st.shadow, p_shadow_color: st.shadowColor });
  if (error) throw new Error(error.message.includes('not allowed') ? 'Only the commissioner can do this.' : error.message.replace(/^.*?ERROR:\s*/, ''));
  await load();
}
