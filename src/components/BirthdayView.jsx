import React, { useState } from 'react';
import PlayerTile from './PlayerTile.jsx';
import PlayerModal from './PlayerModal.jsx';
import TeamBadge from './TeamBadge.jsx';
import { getAllPlayers } from '../data/players.js';
import { getTeam, leagueEvents, currentSeason } from '../data/teams.js';

// Birthday & Farewell: a pixel cake, who retired this offseason, and the 26 and 27 year olds (the only ages that retire).
function WatchGroup({ title, note, players, onOpen }) {
  const [all, setAll] = useState(false);
  const shown = all ? players : players.slice(0, 18);
  return (
    <section className="card">
      <h3>{title} <span className="count">{players.length}</span></h3>
      <p className="dim">{note}</p>
      <div className="ptile-grid">{shown.map((p, i) => <PlayerTile key={p.id} player={p} team={getTeam(p.teamId)} index={i} onOpen={onOpen} />)}</div>
      {players.length > 18 && <button className="btn small ghost" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${players.length}`}</button>}
    </section>
  );
}

export default function BirthdayView({ done }) {
  const [open, setOpen] = useState(null);
  const retired = leagueEvents().filter((e) => e.kind === 'retired' && (e.season ?? currentSeason()) === currentSeason());
  const watch = getAllPlayers().filter((p) => p.teamId && p.age >= 26).sort((a, b) => b.age - a.age || b.stars - a.stars);
  return (
    <div className="bday">
      <div className="cake" aria-hidden>
        <div className="candles">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ '--i': i }} />)}</div>
        <div className="tier top" /><div className="tier mid" /><div className="tier base" />
        <div className="plate" />
      </div>
      <p className="bday-line">{done
        ? `Every player is a year older. ${retired.length} player${retired.length === 1 ? '' : 's'} said farewell.`
        : 'When the commissioner runs Birthday & Farewell, every player turns a year older. Every 27 year old retires, and a few 26 year olds retire early.'}</p>
      {done && (
        <section className="card">
          <h3>👋 Farewell <span className="count">{retired.length}</span></h3>
          {retired.length ? (
            <ul className="farewell">{retired.map((e) => {
              const t = getTeam(e.teamId);
              return <li key={e.id}>{t && <TeamBadge team={t} size="sm" />}<span>{e.summary}</span>{e.data?.stars != null && <b>{e.data.stars}★</b>}</li>;
            })}</ul>
          ) : <p className="dim">Nobody retired this year.</p>}
        </section>
      )}
      <WatchGroup title="🕯️ Final season: 27 year olds" note="Playing their last season. They retire at their next birthday." players={watch.filter((p) => p.age >= 27)} onOpen={setOpen} />
      <WatchGroup title="⏳ Could retire early: 26 year olds" note="About a 1 in 5 chance each to retire at their next birthday. Stars are less likely to, role players more likely." players={watch.filter((p) => p.age === 26)} onOpen={setOpen} />
      {open && <PlayerModal player={open} team={getTeam(open.teamId)} onClose={() => setOpen(null)} />}
    </div>
  );
}
