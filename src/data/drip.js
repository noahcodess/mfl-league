// Player drip: what each player wears with his uniform (helmet model and gear), the helmet models, team helmet designs,
// the commissioner's direct edits, and coach change requests (one change at a time, then a wait).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { DEFAULT_DRIP } from '../lib/uniformGear.js';

export const HELMETS = [
  ['axiom', 'Axiom', 'Riddell. The newest, most futuristic shell. Running backs love it.'],
  ['speedflex', 'SpeedFlex', 'Riddell. The classic modern helmet with the flex panel up front.'],
  ['f7', 'F7', 'Schutt. Boxy ridged shell and a tall cage mask. Big with linemen.'],
];
export const DESIGNS = [['stripe', 'Center stripe'], ['double', 'Two thin stripes'], ['logo', 'Logo on the sides'], ['logo_stripe', 'Logo and stripe'], ['plain', 'Plain']];
const DEMO_DESIGNS = { crf: 'logo', ddc: 'logo_stripe', drf: 'logo', dst: 'stripe', edc: 'logo', flf: 'plain', lsc: 'logo', ntw: 'logo', ocm: 'double', ocn: 'logo_stripe', pln: 'logo', snm: 'logo_stripe', tga: 'logo', void: 'logo', wrf: 'logo', wsl: 'double' };
export const helmetDesign = (team) => team?.helmetDesign || DEMO_DESIGNS[team?.id] || 'stripe';
export const helmetName = (id) => (HELMETS.find((h) => h[0] === id) || HELMETS[1])[1];

const DEMO_DRIP = { helmet: 'speedflex', undershirt: 'short', undershirtColor: 'black', sleeves: 'left', sleeveStyle: 'solid', sleeveColor: 'black', gloves: 'both', gloveColor: 'trim', pants: 'classic' };

// One player's drip (falls back to plain defaults). `version` reloads it after an edit.
export function usePlayerDrip(playerId, version = 0) {
  const [drip, setDrip] = useState(null);
  useEffect(() => {
    let live = true;
    if (!playerId) return undefined;
    if (DEMO) { setDrip({ ...DEFAULT_DRIP, ...DEMO_DRIP, ...(playerId === 'snm-03' ? { helmet: 'f7' } : {}) }); return undefined; }
    db.from('player_drip').select('drip').eq('player_id', playerId).maybeSingle()
      .then(({ data }) => { if (live) setDrip({ ...DEFAULT_DRIP, ...(data?.drip || {}) }); });
    return () => { live = false; };
  }, [playerId, version]);
  return drip;
}

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args) {
  if (DEMO) return {};
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}
export const setDrip = (playerId, drip) => rpc('commish_set_drip', { p_player: playerId, p_drip: drip });
export const setHelmetDesign = (teamId, design) => rpc('commish_set_helmet_design', { p_team: teamId, p_design: design });

// Request system: one customization per request, one approved change per player every few league periods (weeks or offseason steps).
const GROUPS = [['Helmet', ['helmet']], ['Undershirt', ['undershirt', 'undershirtColor']], ['Arm sleeves', ['sleeves', 'sleeveStyle', 'sleeveColor', 'sleeveColor2']],
  ['Gloves', ['gloves', 'gloveColor']], ['Play sheet', ['playsheet']], ['Pants', ['pants']], ['Compression shorts', ['compression']], ['Leg sleeves', ['legSleeves', 'legColor']]];
// What changed between two drips (and numbers), by customization group. Matches the server's check.
export function dripChanges(a, b, n1, n2) {
  const out = GROUPS.filter(([, ks]) => ks.some((k) => JSON.stringify(a?.[k] ?? null) !== JSON.stringify(b?.[k] ?? null))).map(([g]) => g);
  if ((n1 ?? null) !== (n2 ?? null)) out.push('Number');
  return out;
}

// { pending: bool, left: periods to wait } for one player.
export function useDripStatus(playerId, version = 0) {
  const [s, setS] = useState(null);
  useEffect(() => {
    let live = true;
    if (!playerId) return undefined;
    if (DEMO) { setS({ pending: false, left: 0 }); return undefined; }
    db.rpc('drip_cooldown', { p_player: playerId }).then(({ data }) => { if (live) setS(data || { pending: false, left: 0 }); });
    return () => { live = false; };
  }, [playerId, version]);
  return s;
}
export const requestDrip = (playerId, drip, number) => rpc('request_drip_change', { p_player: playerId, p_drip: drip, p_number: number });
export const decideDrip = (id, approve) => rpc('decide_drip_change', { p_request: id, p_approve: approve });
