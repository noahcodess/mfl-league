// One player's attributes (everyone can see) and their ceilings (only if this person may see his potential).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { ATTRIBUTES } from '../lib/attributeDefs.js';
import { seeded } from '../lib/seed.js';

// Test-only stand-in so screenshots work offline; the real numbers come from the database.
function demoAttributes(p, pot) {
  const roll = seeded(`attr-${p.id}`);
  const target = 28 + p.stars * 13;
  const ratings = {}; const ceilings = {};
  for (const [key] of ATTRIBUTES[p.position] || []) {
    const v = Math.max(25, Math.min(99, Math.round(target + roll(25) - 12)));
    ratings[key] = v;
    ceilings[key] = Math.min(99, v + Math.round(((pot ?? p.stars) - p.stars) * 13 * (0.6 + roll(9) / 10)));
  }
  return { ratings, ceilings: pot != null ? ceilings : null };
}

export function usePlayerAttributes(player, potential) {
  const [state, setState] = useState({ ratings: null, ceilings: null, loaded: false });
  useEffect(() => {
    let live = true;
    if (!player) return undefined;
    if (DEMO) { setState({ ...demoAttributes(player, potential), loaded: true }); return undefined; }
    Promise.all([
      db.from('player_attributes').select('ratings').eq('player_id', player.id).maybeSingle(),
      db.from('player_potential').select('ceilings').eq('player_id', player.id).maybeSingle(),
    ]).then(([a, c]) => { if (live) setState({ ratings: a.data?.ratings || null, ceilings: c.data?.ceilings || null, loaded: true }); });
    return () => { live = false; };
  }, [player?.id, potential]);
  return state;
}
