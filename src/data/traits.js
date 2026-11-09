// Loads player personalities (money / playing time / legacy, greed, loyalty, patience). The database only returns
// the players this person may see: his own team, or everyone for the commissioner and site owner.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { traitsFor } from '../lib/playerTraits.js';
import { store } from './store.js';

const toTraits = (r) => ({ money: Number(r.money), playingTime: Number(r.playing_time), legacy: Number(r.legacy),
  greed: Number(r.greed), loyalty: Number(r.loyalty), patience: r.patience });

export function usePlayerTraits(viewerKey, teamId) {
  const [map, setMap] = useState({});
  useEffect(() => {
    let live = true;
    if (!viewerKey) { setMap({}); return undefined; }
    if (DEMO) { // test-only stand-ins for the demo team
      setMap(Object.fromEntries(store.league.players.filter((p) => p.teamId === teamId).map((p) => [p.id, { ...traitsFor(p), loyalty: 0.5, patience: 3 }])));
      return undefined;
    }
    db.from('player_traits').select('*').then(({ data }) => { if (live) setMap(Object.fromEntries((data || []).map((r) => [r.player_id, toTraits(r)]))); });
    return () => { live = false; };
  }, [viewerKey, teamId]);
  return map;
}
