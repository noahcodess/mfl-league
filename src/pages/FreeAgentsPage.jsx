import React, { useState } from 'react';
import PlayerTable from '../components/PlayerTable.jsx';
import FaOfferModal, { FA_JERSEY } from '../components/FaOfferModal.jsx';
import PlayerModal from '../components/PlayerModal.jsx';
import ScoutButton from '../components/ScoutButton.jsx';
import MyOffers from '../components/MyOffers.jsx';
import { getFreeAgents } from '../data/players.js';
import { getTeam } from '../data/teams.js';
import { ALL_POSITIONS } from '../data/positions.js';
import { usePotentials } from '../data/potentials.js';
import { useFaOffers, faOpen, faRound, faRounds } from '../data/freeAgency.js';
import { useMyScouts } from '../data/scouting.js';

// The free agent market: every unsigned player, filter by position, sort. Tap one for his full card (potential stays locked
// until you scout him); from the card you can scout or make an offer during free agency. Your scouts left sit up top.

function marketStatus() {
  if (faOpen()) return faRound() >= faRounds() ? `All ${faRounds()} rounds done. Leftovers sign when free agency closes.` : `Free agency is open. Round ${faRound() + 1} of ${faRounds()} is next.`;
  return 'Offers open during the Free agency step, right after re-signing. Scout now.';
}

export default function FreeAgentsPage({ viewer }) {
  const [pos, setPos] = useState('ALL');
  const [open, setOpen] = useState(null), [offer, setOffer] = useState(null);
  const [version, setVersion] = useState(0);
  const viewerKey = viewer ? `${viewer.user_id}-${viewer.team_id}-${viewer.role}` : null;
  const potentials = usePotentials(viewerKey && `${viewerKey}-${version}`);
  const scouts = useMyScouts(viewer?.role === 'coach' ? viewerKey : null, version);
  const offers = useFaOffers(viewerKey, version);
  const myTeam = viewer?.role === 'coach' && viewer.team_id ? getTeam(viewer.team_id) : null;
  const myOffers = offers.filter((o) => o.team_id === myTeam?.id);
  const offeredIds = new Set(myOffers.filter((o) => o.status === 'open').map((o) => o.player_id));
  const all = getFreeAgents();
  const seesPot = Object.keys(potentials.map).some((id) => all.some((p) => p.id === id));
  const shown = all.filter((p) => pos === 'ALL' || p.position === pos);
  const count = (p) => all.filter((x) => x.position === p).length;

  return (
    <div className="fa-page" style={myTeam ? { '--team': myTeam.color, '--team-accent': myTeam.accent } : undefined}>
      <div className="page-head">
        <h1>Free Agents <span className="count">{all.length}</span>{myTeam && <span className="fa-scouts" title="Free agency scouts: 5 a season. A scout shows a player's potential to your team only.">🔭 {scouts?.fa ?? '-'} scouts left</span>}</h1>
        <p className="dim">{marketStatus()}</p>
      </div>
      <div className="two-col wide-left">
        <section className="card">
          <div className="pos-chips">
            <button className={pos === 'ALL' ? 'on' : ''} onClick={() => setPos('ALL')}>All <small>{all.length}</small></button>
            {ALL_POSITIONS.map((p) => (
              <button key={p} className={pos === p ? 'on' : ''} disabled={!count(p)} onClick={() => setPos(p)}>{p} <small>{count(p)}</small></button>
            ))}
          </div>
          {!shown.length && <p className="dim">Nobody here right now.</p>}
          <PlayerTable players={shown} jersey={FA_JERSEY} onOpen={setOpen} potentials={seesPot ? potentials.map : null}
            sub={(p) => (p.previousTeamId ? `Last team: ${getTeam(p.previousTeamId)?.code || p.previousTeamId}` : p.nationality && p.nationality !== 'USA' ? p.nationality : 'Free agent')}
            tags={(p) => (offeredIds.has(p.id) ? <span className="offer-tag">Your offer</span> : null)} />
        </section>
        <MyOffers team={myTeam} offers={myOffers} onOpen={(id) => setOffer(all.find((p) => p.id === id) || null)} />
      </div>
      {open && (() => {
        const pot = potentials.map[open.id], scouted = (scouts?.scouted || []).includes(open.id);
        return (
          <PlayerModal player={open} team={{ ...FA_JERSEY, name: 'Free agent' }} myTeamId={myTeam?.id} canSeePotential={pot != null} potential={pot ?? null} onClose={() => setOpen(null)}
            extra={myTeam && (
              <div className="fa-card-acts">
                {scouts && <ScoutButton player={open} left={scouts.fa} scouted={scouted} known={pot != null} onScouted={() => setVersion((v) => v + 1)} />}
                {faOpen() && <button className="btn" onClick={() => { setOffer(open); setOpen(null); }}>{offeredIds.has(open.id) ? '💰 Your offer' : '💰 Make an offer'}</button>}
              </div>
            )} />
        );
      })()}
      {offer && (
        <FaOfferModal player={offer} myTeam={myTeam} canOffer={!!myTeam} potential={potentials.map[offer.id] ?? null}
          scouts={scouts} scouted={(scouts?.scouted || []).includes(offer.id)}
          onClose={() => setOffer(null)} onChanged={() => setVersion((v) => v + 1)} />
      )}
    </div>
  );
}
