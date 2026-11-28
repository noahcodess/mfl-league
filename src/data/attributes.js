// One player's attributes, archetype and rank (everyone can see), each bar's best value (peaks: what a regressed veteran
// lost shows red) and his ceilings (only if this person may see his potential, and only while he still has room to
// grow: once he's reached his potential there's nothing left to outline, even if he's declining).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { ATTRIBUTES, STYLES } from '../lib/attributeDefs.js';
import { seeded } from '../lib/seed.js';
import { potentialLeft } from '../lib/potentialLeft.js';

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
  const styles = Object.keys(STYLES[p.position] || {}), lost = Math.max(0, (p.peakStars || p.stars) - p.stars) || (p.age >= 27 ? 0.5 : 0), peaks = {};   // (demo: 27-year-olds look regressed)
  if (lost) ['speed', 'toughness', ...Object.keys(ratings).filter((k) => !['speed', 'toughness'].includes(k)).slice(0, 3)].forEach((k, n) => { peaks[k] = Math.min(99, ratings[k] + Math.round(lost * (n < 2 ? 18 : 9))); });   // a regressed vet
  return { ratings, peaks, ceilings: potentialLeft(p, pot) ? ceilings : null, style: styles[roll(styles.length || 1)] || null, rank: null };
}

export function usePlayerAttributes(player, potential) {
  const [state, setState] = useState({ ratings: null, peaks: null, ceilings: null, style: null, rank: null, loaded: false });
  useEffect(() => {
    let live = true;
    if (!player) return undefined;
    if (DEMO) { setState({ ...demoAttributes(player, potential), loaded: true }); return undefined; }
    Promise.all([
      db.from('player_attributes').select('ratings, style, peaks').eq('player_id', player.id).maybeSingle(),
      db.from('player_potential').select('ceilings').eq('player_id', player.id).maybeSingle(),
      db.from('player_ranks').select('ovr, pos_rank, overall_rank').eq('player_id', player.id).maybeSingle(),
    ]).then(([a, c, r]) => {
      if (live) setState({ ratings: a.data?.ratings || null, peaks: a.data?.peaks || null, style: a.data?.style || null, ceilings: potentialLeft(player, potential) ? c.data?.ceilings || null : null, rank: r.data || null, loaded: true });
    });
    return () => { live = false; };
  }, [player?.id, potential]);
  return state;
}
