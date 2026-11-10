// The draft class: this season's prospects (everyone can see them; potential stays hidden until scouted).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { toPlayer } from './loadLeague.js';
import { selectAll } from './selectAll.js';
import { ATTRIBUTES } from '../lib/attributeDefs.js';
import { seeded } from '../lib/seed.js';

// Test-only stand-in class so screenshots work offline.
function demoClass(season) {
  const names = ['Tobi Adeyemi', 'Cole Whitlock', 'Jaxon Pruitt', 'Lachlan Ashby', 'Darius Gentry', 'Sione Aumua', 'Marcus Haskins', 'Liam Tremblay'];
  const pos = Object.keys(ATTRIBUTES);
  return names.map((name, i) => {
    const r = seeded(`demo-prospect-${i}`);
    const stars = [1, 1.5, 2, 2.5, 3, 1.5, 2, 3.5][i];
    return { id: `demo-dr-${i}`, name, position: pos[r(pos.length)], stars, age: 21 + r(3), status: 'prospect', notes: [],
      nationality: ['Nigeria', 'USA', 'USA', 'Australia', 'USA', 'Samoa', 'USA', 'Canada'][i], college: ['Alabama', 'Ohio State', 'Utah', 'Oregon', 'LSU', 'Washington', 'Georgia', 'Michigan'][i],
      height: 70 + r(8), weight: 190 + r(120), draftSeason: season,
      collegeStats: { class: 'Senior', games: 13, stats: [['Tackles', 40 + r(40)], ['Sacks', 2 + r(10)], ['INT', r(4)], ['Forced fumbles', r(4)]], honors: i % 3 === 0 ? ['All-Conference First Team'] : [] } };
  });
}

export function useDraftClass(season) {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO) { setList(demoClass(season)); return undefined; }
    selectAll(() => db.from('players').select('*').eq('status', 'prospect').eq('draft_season', season).order('id'))
      .then(({ data }) => { if (live) setList((data || []).map(toPlayer)); });
    return () => { live = false; };
  }, [season]);
  return list;
}
