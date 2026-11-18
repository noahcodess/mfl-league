import React, { useState } from 'react';
import PickList from './PickList.jsx';
import DraftBoard from './DraftBoard.jsx';
import PlayerTable from './PlayerTable.jsx';
import ProspectModal from './ProspectModal.jsx';
import PlayerModal from './PlayerModal.jsx';
import { FA_JERSEY } from './FaOfferModal.jsx';
import { getPicks, nextDraftSeason } from '../data/picks.js';
import { getAllPlayers } from '../data/players.js';
import { getTeam } from '../data/teams.js';
import { useDraftClass } from '../data/draft.js';
import { useDraftFlags } from '../data/draftFlags.js';
import { useMyScouts } from '../data/scouting.js';
import { usePotentials } from '../data/potentials.js';
import { useLeagueNumbers } from '../data/schedule.js';

// My Team → Draft: your picks, the next draft class (out once the regular season reaches the commissioner's reveal week),
// your scouts, and your watch list (any player in the league, not just prospects).

export default function DraftTab({ viewer }) {
  const season = nextDraftSeason(), myTeam = viewer.team_id;
  const [open, setOpen] = useState(null);
  const [version, setVersion] = useState(0);
  const viewerKey = `${viewer.user_id}-${myTeam}-${version}`;
  const prospects = useDraftClass(season);
  const potentials = usePotentials(viewerKey);
  const scouts = useMyScouts(viewerKey, version);
  const { flags, toggle } = useDraftFlags(myTeam);
  const nums = useLeagueNumbers(['prospect_reveal_week', 'draft_scouts_r1', 'draft_scouts_later']);
  const scouted = new Set(scouts?.scouted || []);
  const watched = [...getAllPlayers().filter((p) => p.teamId !== myTeam), ...(prospects || [])].filter((p) => flags.has(p.id));
  const tags = (p) => (
    <>
      {scouted.has(p.id) && <span className="offer-tag">Scouted</span>}
      <span className="offer-tag dim">{p.status === 'prospect' ? 'Prospect' : p.teamId ? getTeam(p.teamId)?.code || 'Team' : 'Free agent'}</span>
      <button className="flag-btn on" title="Take off your watch list" onClick={(e) => { e.stopPropagation(); toggle(p.id); }}>👀</button>
    </>
  );
  return (
    <div className="draft-tab">
      <section className="card draft-tab-head">
        <h3>🎓 The Season {season} draft</h3>
        <div className="scout-counts">
          <div><span>🔭 Draft scouts left</span><b>{scouts?.draft ?? '-'}</b></div>
        </div>
        <small className="dim">
          Draft scouts: {nums?.draft_scouts_r1 ?? 2} per 1st-round pick, {nums?.draft_scouts_later ?? 1} per 2nd or 3rd. They're for this draft only and reset after it.
          {' '}A scout shows a player's potential and bar outlines, to your team only.
        </small>
      </section>
      <PickList picks={getPicks(myTeam)} currentSeason={season} title="Your draft picks" />
      <section className="card">
        <h3>Prospects {prospects?.length ? <span className="count">{prospects.length}</span> : null}</h3>
        {prospects === null ? <p className="dim">Loading prospects...</p> : prospects.length ? (
          <DraftBoard prospects={prospects} potentials={potentials.map} flags={flags} scouted={scouted} canFlag
            onFlag={toggle} onClock={false} onDraft={() => {}} onOpen={setOpen} />
        ) : (
          <p className="dim">The Season {season} class comes out in Week {nums?.prospect_reveal_week ?? 2} of the regular season. Scouting opens the same day, and everyone gets a message when it does.</p>
        )}
      </section>
      <section className="card">
        <h3>👀 Watch list <span className="count">{watched.length}</span></h3>
        {watched.length ? <PlayerTable players={watched} jersey={FA_JERSEY} onOpen={setOpen} potentials={potentials.map} tags={tags} />
          : <p className="dim">Tap 👀 on any player (a prospect, a free agent, anyone on another team) to keep an eye on him here. Only you see this list.</p>}
      </section>
      {open && open.status === 'prospect' && (
        <ProspectModal player={open} potential={potentials.map[open.id] ?? null} scouts={scouts} scouted={scouted.has(open.id)}
          onScouted={() => setVersion((v) => v + 1)} onClose={() => setOpen(null)}
          footer={<button className={`btn ghost${flags.has(open.id) ? ' on' : ''}`} onClick={() => toggle(open.id)}>{flags.has(open.id) ? '👀 Watching' : '👀 Watch him'}</button>} />
      )}
      {open && open.status !== 'prospect' && (
        <PlayerModal player={open} team={open.teamId ? getTeam(open.teamId) : { ...FA_JERSEY, name: 'Free agent' }} myTeamId={myTeam}
          canSeePotential={potentials.map[open.id] != null} potential={potentials.map[open.id] ?? null} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
