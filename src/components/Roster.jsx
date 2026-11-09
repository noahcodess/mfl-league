import React, { useState } from 'react';
import PlayerTile from './PlayerTile.jsx';
import { OFFENSE, DEFENSE, POSITION_NAMES } from '../data/positions.js';

// The roster as a depth chart: one row per position with the starters showing; click to reveal the backups.
const bySlot = (a, b) => (a.slot || 0) - (b.slot || 0);

function OpenSpot({ v }) {
  return (
    <div className="ptile open" title={`Open ${POSITION_NAMES[v.position]} spot`}>
      <span className="open-pos">{v.position}</span><span className="dim">Open spot</span>
    </div>
  );
}

function PositionRow({ pos, players, vacancies, team, onOpen, showAll }) {
  const [open, setOpen] = useState(false);
  const starters = players.filter((p) => p.position === pos && p.depth === 'starter').sort(bySlot);
  const backups = players.filter((p) => p.position === pos && p.depth === 'backup').sort(bySlot);
  const openStart = vacancies.filter((v) => v.position === pos && v.depth === 'starter');
  const openBack = vacancies.filter((v) => v.position === pos && v.depth === 'backup');
  const expanded = open || showAll;
  const backupCount = backups.length + openBack.length;
  return (
    <div className={`pos-row${expanded ? ' expanded' : ''}`}>
      <div className="pos-label" title={POSITION_NAMES[pos]}>
        <b>{pos}</b><small>{POSITION_NAMES[pos]}</small>
      </div>
      <div className="pos-players">
        <div className="pos-line">
          {starters.map((p, i) => <PlayerTile key={p.id} player={p} team={team} index={i} onOpen={onOpen} />)}
          {openStart.map((v) => <OpenSpot key={`s${v.slot}`} v={v} />)}
        </div>
        {expanded && backupCount > 0 && (
          <div className="pos-line backups">
            {backups.map((p, i) => <PlayerTile key={p.id} player={p} team={team} index={i} onOpen={onOpen} />)}
            {openBack.map((v) => <OpenSpot key={`b${v.slot}`} v={v} />)}
          </div>
        )}
      </div>
      {backupCount > 0 && (
        <button className={`pos-toggle${expanded ? ' on' : ''}`} onClick={() => setOpen(!open)} disabled={showAll}>
          {expanded ? 'Hide' : 'Backups'} <span>{backupCount}</span>
        </button>
      )}
    </div>
  );
}

function Side({ title, positions, players, vacancies, team, onOpen }) {
  const [showAll, setShowAll] = useState(false);
  const count = players.filter((p) => positions.includes(p.position)).length;
  return (
    <section className="card depth-card">
      <div className="depth-head-row">
        <h3>{title} <span className="count">{count}</span></h3>
        <button className="btn small ghost" onClick={() => setShowAll(!showAll)}>{showAll ? 'Starters only' : 'Show all backups'}</button>
      </div>
      {positions.map((pos) => (
        <PositionRow key={pos} pos={pos} players={players} vacancies={vacancies} team={team} onOpen={onOpen} showAll={showAll} />
      ))}
    </section>
  );
}

export default function Roster({ players, vacancies, team, onOpen }) {
  return (
    <>
      <Side title="Offense" positions={OFFENSE} players={players} vacancies={vacancies} team={team} onOpen={onOpen} />
      <Side title="Defense" positions={DEFENSE} players={players} vacancies={vacancies} team={team} onOpen={onOpen} />
    </>
  );
}
