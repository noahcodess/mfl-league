import React, { useState } from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { OFFENSE, DEFENSE, POSITION_NAMES } from '../data/positions.js';

// The roster as a real depth chart: a card per position, players stacked top to bottom with the best starter on top
// (WR1, WR2...), backups tucked under "+ backups". Insiders also see contract years and potential.
const best = (a, b) => b.stars - a.stars || (a.slot || 0) - (b.slot || 0) || (a.age || 0) - (b.age || 0);

function DepthRow({ p, label, team, onOpen, insider, backup }) {
  const pot = insider ? insider[p.id] : null;
  return (
    <button className={`depth-row${backup ? ' backup' : ''}`} onClick={() => onOpen(p)}>
      <span className="depth-slot">{label}</span>
      <Headshot player={p} team={team} size={40} />
      <span className="depth-main">
        <span className="depth-name"><span className="depth-num">#{p.number ?? '-'}</span> {p.name}
        </span>
        <span className="depth-sub">
          <StarRating value={p.stars} elite={p.elite} />
          <span className="dim">Age {p.age ?? '-'}</span>
          {pot != null && pot > p.stars && <span className="pot-mini">POT <StarRating value={pot} elite={pot === 5} /></span>}
        </span>
      </span>
    </button>
  );
}

function PositionCard({ pos, players, vacancies, team, onOpen, insider, showAll }) {
  const [open, setOpen] = useState(false);
  const starters = players.filter((p) => p.position === pos && p.depth === 'starter').sort(best);
  const backups = players.filter((p) => p.position === pos && p.depth === 'backup').sort(best);
  const openSpots = vacancies.filter((v) => v.position === pos).length;
  const expanded = open || showAll;
  return (
    <div className="pos-card">
      <div className="pos-card-head"><b>{pos}</b><span>{POSITION_NAMES[pos]}</span></div>
      {starters.map((p, i) => <DepthRow key={p.id} p={p} label={starters.length > 1 ? `${pos}${i + 1}` : pos} team={team} onOpen={onOpen} insider={insider} />)}
      {expanded && backups.map((p, i) => <DepthRow key={p.id} p={p} label={`${pos}${starters.length + i + 1}`} team={team} onOpen={onOpen} insider={insider} backup />)}
      {openSpots > 0 && <div className="depth-open">{openSpots} open spot{openSpots > 1 ? 's' : ''}</div>}
      {backups.length > 0 && !showAll && (
        <button className="show-more" onClick={() => setOpen(!open)}>{open ? 'Hide backups' : `+ ${backups.length} backup${backups.length > 1 ? 's' : ''}`}</button>
      )}
    </div>
  );
}

function Side({ title, positions, ...rest }) {
  const [showAll, setShowAll] = useState(false);
  const count = rest.players.filter((p) => positions.includes(p.position)).length;
  return (
    <section className="card depth-card">
      <div className="depth-head-row">
        <h3>{title} <span className="count">{count}</span></h3>
        <button className="btn small ghost" onClick={() => setShowAll(!showAll)}>{showAll ? 'Starters only' : 'Show all backups'}</button>
      </div>
      <div className="pos-grid">
        {positions.map((pos) => <PositionCard key={pos} pos={pos} showAll={showAll} {...rest} />)}
      </div>
    </section>
  );
}

export default function Roster(props) {
  return (
    <>
      <Side title="Offense" positions={OFFENSE} {...props} />
      <Side title="Defense" positions={DEFENSE} {...props} />
    </>
  );
}
