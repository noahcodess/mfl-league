import React, { useState } from 'react';
import PlayerTile from '../components/PlayerTile.jsx';
import FaOfferModal, { FA_JERSEY } from '../components/FaOfferModal.jsx';
import MyOffers from '../components/MyOffers.jsx';
import { getFreeAgents } from '../data/players.js';
import { getTeam } from '../data/teams.js';
import { OFFENSE, DEFENSE } from '../data/positions.js';
import { usePotentials } from '../data/potentials.js';
import { useFaOffers, faOpen, faRound, faRounds } from '../data/freeAgency.js';

// The free agent market: every unsigned player, filter by position, sort, and make offers during free agency.
const SORTS = {
  best: { label: 'Best', fn: (a, b) => b.stars - a.stars || a.age - b.age },
  young: { label: 'Youngest', fn: (a, b) => a.age - b.age || b.stars - a.stars },
};

function marketStatus() {
  if (faOpen()) return faRound() >= faRounds() ? `All ${faRounds()} rounds done. Leftovers sign when free agency closes.` : `Free agency is open. Round ${faRound() + 1} of ${faRounds()} is next.`;
  return 'Offers open during the Free agency step, right after re-signing. Scout now.';
}

export default function FreeAgentsPage({ viewer }) {
  const [pos, setPos] = useState('ALL');
  const [sort, setSort] = useState('best');
  const [open, setOpen] = useState(null);
  const [version, setVersion] = useState(0);
  const viewerKey = viewer ? `${viewer.user_id}-${viewer.team_id}-${viewer.role}` : null;
  const potentials = usePotentials(viewerKey);
  const offers = useFaOffers(viewerKey, version);
  const myTeam = viewer?.role === 'coach' && viewer.team_id ? getTeam(viewer.team_id) : null;
  const myOffers = offers.filter((o) => o.team_id === myTeam?.id);
  const offeredIds = new Set(myOffers.filter((o) => o.status === 'open').map((o) => o.player_id));
  const all = getFreeAgents();
  const seesPot = Object.keys(potentials.map).some((id) => all.some((p) => p.id === id));
  const sorts = seesPot ? { ...SORTS, pot: { label: 'Potential', fn: (a, b) => (potentials.map[b.id] ?? 0) - (potentials.map[a.id] ?? 0) || a.age - b.age } } : SORTS;
  const shown = all.filter((p) => pos === 'ALL' || p.position === pos).sort(sorts[sort].fn);
  const count = (p) => all.filter((x) => x.position === p).length;

  return (
    <div className="fa-page" style={myTeam ? { '--team': myTeam.color, '--team-accent': myTeam.accent } : undefined}>
      <div className="page-head">
        <h1>Free Agents <span className="count">{all.length}</span></h1>
        <p className="dim">{marketStatus()}</p>
      </div>
      <div className="two-col wide-left">
        <section className="card">
          <div className="fa-filters">
            <div className="pos-chips">
              <button className={pos === 'ALL' ? 'on' : ''} onClick={() => setPos('ALL')}>All</button>
              {[...OFFENSE, ...DEFENSE].map((p) => (
                <button key={p} className={pos === p ? 'on' : ''} disabled={!count(p)} onClick={() => setPos(p)}>{p} <small>{count(p)}</small></button>
              ))}
            </div>
            <div className="seg sort-seg">{Object.entries(sorts).map(([k, s]) => (
              <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{s.label}</button>
            ))}</div>
          </div>
          {!shown.length && <p className="dim">Nobody here right now.</p>}
          <div className="fa-grid">
            {shown.map((p, i) => (
              <PlayerTile key={p.id} player={p} team={FA_JERSEY} index={i} onOpen={setOpen} insider={seesPot ? potentials.map : null}
                badge={offeredIds.has(p.id) ? <span className="offer-tag">Your offer</span> : null} />
            ))}
          </div>
        </section>
        <MyOffers team={myTeam} offers={myOffers} onOpen={(id) => setOpen(all.find((p) => p.id === id) || null)} />
      </div>
      {open && (
        <FaOfferModal player={open} myTeam={myTeam} canOffer={!!myTeam} potential={potentials.map[open.id] ?? null}
          onClose={() => setOpen(null)} onChanged={() => setVersion((v) => v + 1)} />
      )}
    </div>
  );
}
