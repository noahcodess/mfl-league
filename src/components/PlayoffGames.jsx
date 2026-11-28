import React, { useState } from 'react';
import GameOdds from './GameOdds.jsx';
import { useSeasonGames, setGameTime, setGameWindow, WINDOWS, PROGRAMS } from '../data/games.js';
import { currentSeason } from '../data/teams.js';
import { ROUNDS } from '../lib/playoffRounds.js';
const toInput = (iso) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

// Commissioner's Desk → Schedule → Playoffs: each playoff game's broadcast and kickoff time. Games start on a network
// picked at random (its main broadcast, with the network's logo). A Quarterfinal or Semifinal can be moved to another
// network or a show like Saturday Night (never Thursday Night). The Craft Bowl only takes a network, never the same one
// two seasons in a row (it's also set in the Craft Bowl tab).
export default function PlayoffGames({ canControl }) {
  const [version, setVersion] = useState(0), [error, setError] = useState('');
  const all = useSeasonGames(currentSeason(), version);
  const act = async (fn) => { setError(''); try { await fn(); setVersion((v) => v + 1); } catch (e) { setError(e.message); } };
  if (!all) return <p className="dim">Loading the playoffs...</p>;
  const rounds = ROUNDS.map((r) => ({ ...r, games: all.filter((g) => g.kind === r.kind) })).filter((r) => r.games.length);
  if (!rounds.length) return <p className="dim">No playoff games yet. The Quarterfinals are set when the commissioner starts the playoffs after the award ceremony.</p>;
  return (
    <div className="season-games">
      {error && <p className="form-error">{error}</p>}
      {rounds.map((r) => (
        <section key={r.kind}>
          <h3>{r.icon} {r.name}</h3>
          <ol className="sg-list">
            {r.games.map((g) => {
              const shows = r.kind === 'craft_bowl' ? [] : WINDOWS.filter(([k]) => k !== 'thu_night');
              return (
                <li key={g.id} className="prime">
                  <GameOdds game={g} />
                  <span className="sg-controls">
                    <select value={g.prime || ''} disabled={!canControl || g.status === 'final'} onChange={(e) => act(() => setGameWindow(g.id, e.target.value))} title="Broadcast">
                      {!g.prime && <option value="">📺 Pick a broadcast</option>}
                      <optgroup label="Network (main broadcast)">{PROGRAMS.map(([k, , net]) => <option key={k} value={k}>{net}</option>)}</optgroup>
                      {shows.length > 0 && <optgroup label="A show">{shows.map(([k, label, net]) => <option key={k} value={k}>{label}{net ? ` (${net})` : ' (FOX/CBS)'}</option>)}</optgroup>}
                    </select>
                    <input type="datetime-local" value={toInput(g.starts_at)} disabled={!canControl || g.status === 'final'}
                      onChange={(e) => act(() => setGameTime(g.id, e.target.value ? new Date(e.target.value).toISOString() : null))} />
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
