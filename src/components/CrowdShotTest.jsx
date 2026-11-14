import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import IntroCrowd from './IntroCrowd.jsx';
import { getTeams, getTeam } from '../data/teams.js';
import { useStadiums } from '../data/stadiums.js';
import { useJerseys } from '../data/jerseys.js';
import { broadcastFor } from '../data/broadcast.js';
import { gameWeather } from '../lib/introFacts.js';
import { ACTS } from '../lib/crowdActs.js';
import { stadiumLook, STADIUM_KINDS } from '../lib/stadiumLooks.js';

const PROGRAMS = [['FOX', 'sun_day', 'Overworld'], ['CBS', 'sun_day', 'Nether'], ['Thursday Night (TNF)', 'thu_night'], ['Sunday Night (SNF)', 'sun_night'],
  ['Saturday Night (ESPN)', 'sat_night'], ['Monday Night (ESPN)', 'mon_night']];

// Commissioner's Desk → Test: play the stadium shot from the game intro for any team, on any program, with any crowd
// animation and any fan colors, without starting a game.
export default function CrowdShotTest() {
  const teams = getTeams().slice().sort((a, b) => a.name.localeCompare(b.name));
  const [teamId, setTeamId] = useState('snm'), [prog, setProg] = useState(0), [act, setAct] = useState(''), [slot, setSlot] = useState(''), [run, setRun] = useState(0);
  const home = getTeam(teamId) || teams[0], stadium = useStadiums()[home.id], alts = useJerseys(home).filter((j) => j.slot >= 3), alt = alts.find((j) => String(j.slot) === slot);
  const [, win, conf] = PROGRAMS[prog], bc = broadcastFor({ window: win }, { ...home, conference: conf || home.conference });
  return (
    <section className="card crowd-test">
      <h3>🏟️ Stadium shot</h3>
      <p>Play the crowd cutscene from the game intro. {home.name} play in a <b>{STADIUM_KINDS[stadiumLook(home, stadium).kind].toLowerCase()}</b> stadium.</p>
      <div className="ct-row">
        <label>Home team<select value={home.id} onChange={(e) => { setTeamId(e.target.value); setSlot(''); }}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Program<select value={prog} onChange={(e) => setProg(Number(e.target.value))}>{PROGRAMS.map(([name], i) => <option key={name} value={i}>{name}</option>)}</select></label>
        <label>Crowd<select value={act} onChange={(e) => setAct(e.target.value)}><option value="">Whatever the game picks</option>{Object.entries(ACTS).map(([k, name]) => <option key={k} value={k}>{name}</option>)}</select></label>
        <label>Fans wear<select value={slot} onChange={(e) => setSlot(e.target.value)}><option value="">Normal team colors</option>{alts.map((j) => <option key={j.slot} value={j.slot}>All {j.name}</option>)}</select></label>
      </div>
      <button className="btn" onClick={() => setRun(run + 1)}>▶ Play the stadium shot</button>
      {run > 0 && createPortal(
        <div className="intro-overlay">
          <div className={`intro-screen net-${bc.net.key}${bc.prime ? ` prime show-${bc.show.key}` : ' day'}`}>
            <IntroCrowd key={run} bc={bc} home={home} stadium={stadium} weather={gameWeather({ id: run, home: home.id }, bc.prime)} gameId={run} act={act || null} dress={alt?.colors.jersey || null} theme={alt?.name || ''} />
            <button className="intro-close" onClick={() => setRun(0)} aria-label="Close">✕</button>
            <button className="btn small ct-again" onClick={() => setRun(run + 1)}>↺ Again</button>
          </div>
        </div>, document.body)}
    </section>
  );
}
