import React from 'react';
import Modal from './Modal.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import MoodTag from './MoodTag.jsx';
import PlayerMoney from './PlayerMoney.jsx';
import PlayerSkills from './PlayerSkills.jsx';
import Tabs from './Tabs.jsx';
import PastTeams from './PastTeams.jsx';
import TradeActions from './TradeActions.jsx';
import PlayerFlags from './PlayerFlags.jsx';
import { contractOf, yearsLeft, contractLabel } from '../data/contracts.js';
import { POSITION_NAMES } from '../data/positions.js';
import { money, heightLabel } from '../lib/format.js';
import { flagFor } from '../lib/flags.js';

// Full player card: bio up top, then tabs for skills (archetype, bars), contract & money, and past teams. Potential only shows to
// the player's own team, the commissioner and scouts.
export default function PlayerModal({ player, team, canSeePotential, potential, traits, onClose, myTeamId }) {
  if (!player) return null;
  const c = contractOf(player);
  return (
    <Modal onClose={onClose} className="pcard" style={{ '--team': team.color, '--team-accent': team.accent }}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        <div className="pcard-head">
          <Headshot player={player} team={team} size={128} />
          <div>
            <div className="pcard-num">#{player.number ?? '-'} · {POSITION_NAMES[player.position] || player.position}</div>
            <h2>{player.name}</h2>
            <div className="pcard-team">{team.name} · {player.depth === 'starter' ? 'Starter' : 'Backup'}</div>
            <StarRating value={player.stars} elite={player.elite} showNumber />
          </div>
        </div>
        <TradeActions player={player} myTeamId={myTeamId} onDone={onClose} />
        <div className="pcard-grid">
          <div><span>Age</span><b>{player.age ?? '-'}</b></div>
          <div><span>Height</span><b>{heightLabel(player.height)}</b></div>
          <div><span>Weight</span><b>{player.weight ? `${player.weight} lbs` : '-'}</b></div>
          <div><span>Country</span><b>{flagFor(player.nationality || 'USA')} {player.nationality || 'USA'}</b></div>
          <div><span>Mood</span><b><MoodTag mood={player.mood} /></b></div>
          <div className="pot"><span>Potential</span><b>{!canSeePotential ? '🔒 Hidden' : potential === undefined ? <span className="dim">Loading...</span> : potential === null ? <span className="dim">Not rated</span>
            : <><StarRating value={potential} elite={potential === 5} />{potential <= player.stars && <small className="dim"> Maxed</small>}</>}</b></div>
        </div>
        <PlayerFlags player={player} />
        <Tabs tabs={[
          { key: 'skills', label: 'Skills', render: () => <PlayerSkills player={player} potential={canSeePotential ? potential : null} /> },
          { key: 'contract', label: 'Contract & money', render: () => (
            <>
        <PlayerFlags player={player} contract />
        {c ? (
          <div className="pcard-grid">
            <div><span>Status</span><b className={yearsLeft(player) === 0 ? 'warn' : ''}>{contractLabel(player)}</b></div>
            <div><span>Runs</span><b>S{c.firstSeason}–S{c.lastSeason}</b></div>
            <div><span>Total</span><b>{money(c.total)}</b></div>
            <div className="hl"><span>Salary / year</span><b>{money(c.perYear)}</b></div>
          </div>
        ) : <p className="dim">No contract. {player.teamId ? 'He can be re-signed during the re-signing period.' : 'Free agent.'}</p>}
        <PlayerMoney player={player} potential={canSeePotential ? potential : null} insider={canSeePotential} traits={traits} />
        {!canSeePotential && <p className="pcard-note">Potential is only visible to this player's team. Scouting will reveal it.</p>}
        {player.notes.length > 0 && <ul className="pcard-flags">{player.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
            </>
          ) },
          { key: 'past', label: 'Past teams', render: () => <PastTeams player={player} /> },
        ]} />
    </Modal>
  );
}
