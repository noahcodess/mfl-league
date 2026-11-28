// Gold logos: each team's Craft Bowl logo, uploaded by the commissioner. The Craft Bowl broadcast uses it in place of the
// normal logo; a team without one keeps its normal logo. Saved on the team (teams.gold_logo_url); a fresh upload shows
// right away everywhere through the shared overrides here.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
const overrides = new Map();   // teamId -> url (or null = removed) since the league loaded
const listeners = new Set();
const tell = () => listeners.forEach((fn) => fn(new Map(overrides)));

// The team's gold logo, or null.
export const goldLogoFor = (team) => (team && overrides.has(team.id) ? overrides.get(team.id) : team?.goldLogo || null);

// Re-renders when a gold logo changes.
export function useGoldLogos() {
  const [, set] = useState(0);
  useEffect(() => { const fn = () => set((n) => n + 1); listeners.add(fn); return () => listeners.delete(fn); }, []);
}

// blob: a checked PNG from prepareLogo.
export async function uploadGoldLogo(teamId, blob) {
  let url;
  if (DEMO) url = URL.createObjectURL(blob);
  else {
    const path = `${teamId}-gold-${Date.now()}.png`;
    const { error } = await db.storage.from('team-logos').upload(path, blob, { contentType: 'image/png', upsert: false });
    if (error) throw new Error(error.message.includes('row-level') ? 'Only the commissioner can upload logos.' : error.message);
    url = db.storage.from('team-logos').getPublicUrl(path).data.publicUrl;
    const { error: e2 } = await db.rpc('set_team_gold_logo', { p_team: teamId, p_url: url });
    if (e2) throw new Error(clean(e2.message));
  }
  overrides.set(teamId, url); tell();
}

export async function removeGoldLogo(teamId) {
  if (!DEMO) { const { error } = await db.rpc('set_team_gold_logo', { p_team: teamId, p_url: null }); if (error) throw new Error(clean(error.message)); }
  overrides.set(teamId, null); tell();
}
