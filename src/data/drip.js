// Player drip: what each player wears with his uniform (helmet model and gear), the helmet models, team helmet designs,
// and the commissioner's direct edits. Coach change requests come with the request system.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { DEFAULT_DRIP } from '../lib/uniformGear.js';

export const HELMETS = [
  ['axiom', 'Axiom', 'Riddell. The newest, most futuristic shell. Running backs love it.'],
  ['speedflex', 'SpeedFlex', 'Riddell. The classic modern helmet with the flex panel up front.'],
  ['f7', 'F7', 'Schutt. Ridged shell and a tall cage mask. Big with linemen.'],
  ['vicis', 'Vicis Zero2 Matrix ID', 'Vicis. Perforated shell, rounded mask. The field general QB helmet.'],
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
