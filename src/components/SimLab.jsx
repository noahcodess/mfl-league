import React, { useMemo, useState } from 'react';
import Gamecast from './Gamecast.jsx';
import PixelGame from './PixelGame.jsx';
import { getTeams, getTeam } from '../data/teams.js';
import { useGameLineups } from '../data/gameLineups.js';
import { playGame } from '../lib/simGame.js';

// Commissioner's Desk → Test: the Sim Lab. Pick two teams and watch the engine play a game, or run hundreds at once to see
// how often each team wins and what the stats average out to. Nothing here is saved or counts; it's for testing the engine.
export default function SimLab() {
  const teams = getTeams().slice().sort((a, b) => a.name.localeCompare(b.name));
  const [away, setAway] = useState('edc'), [home, setHome] = useState('snm'), [game, setGame] = useState(null), [batch, setBatch] = useState(null), [pixels, setPixels] = useState(false);
  const lineups = useGameLineups(home, away), T = { home: getTeam(home), away: getTeam(away) };
  const names = useMemo(() => {
    if (!lineups) return {};
    const out = {};
    for (const side of ['home', 'away']) { lineups[side].all.forEach((p) => { out[p.id] = { ...p, side }; }); ['kickoff', 'punt'].forEach((u) => { const k = lineups[side].kickTeams[u].players[0]; out[k.id] = { ...k, side }; }); }
    return out;
  }, [lineups]);
  const pick = (value, set) => <select value={value} onChange={(e) => { set(e.target.value); setGame(null); setBatch(null); }}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>;
  const many = (n) => {
    const b = { n, home: 0, away: 0, pf: 0, pa: 0, ot: 0, blow: 0 };
    for (let i = 0; i < n; i++) { const g = playGame(lineups.home, lineups.away, 1000 + i); b[g.score.home > g.score.away ? 'home' : 'away'] += 1; b.pf += g.score.home; b.pa += g.score.away; if (g.overtimes) b.ot += 1; if (Math.abs(g.score.home - g.score.away) >= 21) b.blow += 1; }
    setBatch(b);
  };
  return (
    <section className="card crowd-test">
      <h3>🧪 Sim Lab</h3>
      <p>Watch the game engine play. These games are tests: nothing is saved and nothing counts. Quarters are 6:00, overtime is college rules.</p>
      <div className="ct-row"><label>Away{pick(away, setAway)}</label><label>Home{pick(home, setHome)}</label></div>
      {!lineups ? <p className="dim">Loading ratings…</p> : (
        <div className="ct-row">
          <button className="btn" onClick={() => setGame(playGame(lineups.home, lineups.away, Math.floor(Math.random() * 1e9)))}>▶ Watch a game</button>
          <button className="btn" onClick={() => { setGame(playGame(lineups.home, lineups.away, Math.floor(Math.random() * 1e9))); setPixels(true); }}>📺 Watch in pixels</button>
          <button className="btn ghost" onClick={() => many(500)}>⚡ Run 500 games</button>
        </div>
      )}
      {batch && <p className="sl-batch"><b>{batch.n} games:</b> {T.away.name} won {Math.round((100 * batch.away) / batch.n)}%, {T.home.name} won {Math.round((100 * batch.home) / batch.n)}%. Average score {(batch.pa / batch.n).toFixed(1)} to {(batch.pf / batch.n).toFixed(1)}. {Math.round((100 * batch.ot) / batch.n)}% went to overtime, {Math.round((100 * batch.blow) / batch.n)}% were decided by 21 or more.</p>}
      {game && pixels && lineups && <PixelGame key={game.seed} game={game} teams={T} lineups={lineups} onClose={() => setPixels(false)} />}
      {game && <Gamecast game={game} teams={T} names={names} />}
    </section>
  );
}
