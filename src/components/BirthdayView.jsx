import React, { useState } from 'react';
import PlayerTile from './PlayerTile.jsx';
import PlayerModal from './PlayerModal.jsx';
import TeamBadge from './TeamBadge.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { getAllPlayers } from '../data/players.js';
import { getTeam, currentSeason } from '../data/teams.js';
import { useFarewell } from '../data/farewell.js';
import { advanceOffseason } from '../data/leagueEngine.js';

// Birthday & Farewell on the Live tab: a pixel cake, the commissioner's Start button (with a share-your-screen tip),
// who retired this offseason (and a button to watch the show), and the 26 and 27 year olds (the only ages that retire).
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

export default function BirthdayView({ done, canControl, reload }) {
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');
  const farewell = useFarewell(currentSeason());
  const retired = farewell?.retired || [];
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
        : 'When the commissioner runs Birthday & Farewell, every player turns a year older. Players 25 and under go up 1 star (up to their potential), 25 year olds can slip instead, 26 and 27 don\'t grow. Every 27 year old retires, and a few 26 year olds retire early.'}</p>
      {!done && canControl && (
        <div className="bday-start">
          <p>📺 <b>Tip:</b> share your screen before you press Start (or before the countdown hits 0) so everyone watches the farewell show together.</p>
          <ConfirmButton className="btn big" label="▶ Start Birthday & Farewell" title="Start Birthday & Farewell now?" yes="Start it"
            text="Every player turns a year older, young players go up a star, retirements happen, and the farewell show plays on this screen."
            onConfirm={async () => { setError(''); try { await advanceOffseason(); await reload?.(); } catch (e) { setError(e.message); } }} />
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
      {done && (
        <section className="card">
          <h3>👋 Farewell <span className="count">{retired.length}</span>
            <button className="btn small" onClick={() => window.dispatchEvent(new Event('mfl-bday-replay'))}>🎬 Watch the show</button></h3>
          {retired.length ? (
            <ul className="farewell">{retired.map((r) => {
              const t = getTeam(r.lastTeamId);
              return <li key={r.id}>{t && <TeamBadge team={t} size="sm" />}<span>{r.position} {r.name} retired at {r.retiredAge}</span><b>{r.stars}★</b></li>;
            })}</ul>
          ) : <p className="dim">{farewell ? 'Nobody retired this year.' : 'Loading...'}</p>}
        </section>
      )}
      <WatchGroup title="🕯️ Final season: 27 year olds" note="Playing their last season. They retire at their next birthday." players={watch.filter((p) => p.age >= 27)} onOpen={setOpen} />
      <WatchGroup title="⏳ Could retire early: 26 year olds" note="About a 1 in 5 chance each to retire at their next birthday. Stars are less likely to, role players more likely." players={watch.filter((p) => p.age === 26)} onOpen={setOpen} />
      {open && <PlayerModal player={open} team={getTeam(open.teamId)} onClose={() => setOpen(null)} />}
    </div>
  );
}
