import React, { useState } from 'react';
import PlayerTile from '../components/PlayerTile.jsx';
import ProspectModal from '../components/ProspectModal.jsx';
import { FA_JERSEY } from '../components/FaOfferModal.jsx';
import { useDraftClass } from '../data/draft.js';
import { useMyScouts } from '../data/scouting.js';
import { usePotentials } from '../data/potentials.js';
import { currentSeason } from '../data/teams.js';
import { OFFENSE, DEFENSE } from '../data/positions.js';

// The draft class: every prospect for this season's draft, with college numbers, filters and scouting.
const SORTS = {
  best: { label: 'Best now', fn: (a, b) => b.stars - a.stars || a.age - b.age },
  young: { label: 'Youngest', fn: (a, b) => a.age - b.age || b.stars - a.stars },
};

export default function DraftPage({ viewer }) {
  const season = currentSeason();
  const [pos, setPos] = useState('ALL');
  const [sort, setSort] = useState('best');
  const [open, setOpen] = useState(null);
  const [version, setVersion] = useState(0);
  const viewerKey = viewer ? `${viewer.user_id}-${viewer.team_id}-${viewer.role}-${version}` : null;
  const prospects = useDraftClass(season);
  const potentials = usePotentials(viewerKey);
  const scouts = useMyScouts(viewer?.role === 'coach' ? viewerKey : null, version);
  const scoutedIds = new Set(scouts?.scouted || []);
  if (!prospects) return <p className="dim">Loading the draft class...</p>;
  const shown = prospects.filter((p) => pos === 'ALL' || p.position === pos).sort(SORTS[sort].fn);
  const count = (p) => prospects.filter((x) => x.position === p).length;
  return (
    <div className="fa-page">
      <div className="page-head">
        <h1>Season {season} Draft Class <span className="count">{prospects.length}</span></h1>
        <p className="dim">Rookies come in about 2 stars under their potential. Send scouts to find the gems. Anyone not drafted becomes a free agent.</p>
        {scouts && <p className="scout-count">🔭 {scouts.draft} draft scouts left · {scoutedIds.size} players scouted</p>}
      </div>
      <section className="card">
        <div className="fa-filters">
          <div className="pos-chips">
            <button className={pos === 'ALL' ? 'on' : ''} onClick={() => setPos('ALL')}>All</button>
            {[...OFFENSE, ...DEFENSE].map((p) => (
              <button key={p} className={pos === p ? 'on' : ''} disabled={!count(p)} onClick={() => setPos(p)}>{p} <small>{count(p)}</small></button>
            ))}
          </div>
          <div className="seg sort-seg">{Object.entries(SORTS).map(([k, s]) => (
            <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{s.label}</button>
          ))}</div>
        </div>
        <div className="fa-grid">
          {shown.map((p, i) => (
            <PlayerTile key={p.id} player={p} team={FA_JERSEY} index={i} onOpen={setOpen} insider={potentials.map}
              badge={scoutedIds.has(p.id) ? <span className="offer-tag">Scouted</span> : null} />
          ))}
        </div>
      </section>
      {open && (
        <ProspectModal player={open} potential={potentials.map[open.id] ?? null} scouts={scouts} scouted={scoutedIds.has(open.id)}
          onScouted={() => setVersion((v) => v + 1)} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
