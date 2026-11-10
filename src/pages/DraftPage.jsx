import React, { useState } from 'react';
import PlayerTable from '../components/PlayerTable.jsx';
import ProspectModal from '../components/ProspectModal.jsx';
import DraftOrder from '../components/DraftOrder.jsx';
import Tabs from '../components/Tabs.jsx';
import { FA_JERSEY } from '../components/FaOfferModal.jsx';
import { useDraftClass, useDraftOrder } from '../data/draft.js';
import { useMyScouts } from '../data/scouting.js';
import { usePotentials } from '../data/potentials.js';
import { currentSeason } from '../data/teams.js';
import { OFFENSE, DEFENSE } from '../data/positions.js';

// The draft: a sortable big board of every prospect (filter by position, scout the ones you like) and the draft order.
export default function DraftPage({ viewer }) {
  const season = currentSeason();
  const [pos, setPos] = useState('ALL');
  const [open, setOpen] = useState(null);
  const [version, setVersion] = useState(0);
  const viewerKey = viewer ? `${viewer.user_id}-${viewer.team_id}-${viewer.role}-${version}` : null;
  const prospects = useDraftClass(season);
  const order = useDraftOrder(season);
  const potentials = usePotentials(viewerKey);
  const scouts = useMyScouts(viewer?.role === 'coach' ? viewerKey : null, version);
  const scoutedIds = new Set(scouts?.scouted || []);
  if (!prospects) return <p className="dim">Loading the draft class...</p>;
  const shown = prospects.filter((p) => pos === 'ALL' || p.position === pos);
  const count = (p) => prospects.filter((x) => x.position === p).length;

  const board = () => (
    <>
      <div className="pos-chips">
        <button className={pos === 'ALL' ? 'on' : ''} onClick={() => setPos('ALL')}>All <small>{prospects.length}</small></button>
        {[...OFFENSE, ...DEFENSE].map((p) => (
          <button key={p} className={pos === p ? 'on' : ''} disabled={!count(p)} onClick={() => setPos(p)}>{p} <small>{count(p)}</small></button>
        ))}
      </div>
      <PlayerTable players={shown} jersey={FA_JERSEY} onOpen={setOpen} potentials={potentials.map}
        sub={(p) => `${p.college} · ${p.collegeStats?.class || 'Senior'}`}
        tags={(p) => (scoutedIds.has(p.id) ? <span className="offer-tag">Scouted</span> : null)} />
    </>
  );

  return (
    <div className="fa-page">
      <div className="page-head">
        <h1>Season {season} Draft</h1>
        <p className="dim">{prospects.length} prospects. Rookies come in about 2 stars under their potential, so scout the ones you like. Anyone not drafted becomes a free agent.</p>
        {scouts && <p className="scout-count">🔭 {scouts.draft} draft scouts left · {scoutedIds.size} scouted</p>}
      </div>
      <section className="card">
        <Tabs tabs={[
          { key: 'board', label: 'Big board', render: board },
          { key: 'order', label: 'Draft order', render: () => <DraftOrder season={season} order={order} myTeamId={viewer?.role === 'coach' ? viewer.team_id : null} /> },
        ]} />
      </section>
      {open && (
        <ProspectModal player={open} potential={potentials.map[open.id] ?? null} scouts={scouts} scouted={scoutedIds.has(open.id)}
          onScouted={() => setVersion((v) => v + 1)} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
