import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import GameOdds from './GameOdds.jsx';
import { useSeasonGames, createPreseason, deletePreseason, WINDOWS } from '../data/games.js';
import { getTeams, currentSeason } from '../data/teams.js';

// Commissioner's Desk → Schedule → Preseason: one-off games after the draft. Pick both teams, a broadcast window and a
// kickoff. Coaches see them on the Live tab with a countdown.
export default function PreseasonGames({ canControl }) {
  const [version, setVersion] = useState(0);
  const [f, setF] = useState({ home: '', away: '', win: '', at: '' });
  const [error, setError] = useState('');
  const games = (useSeasonGames(currentSeason(), version) || []).filter((g) => g.kind === 'preseason');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const act = async (fn) => { setError(''); try { await fn(); setVersion((v) => v + 1); } catch (e) { setError(e.message); } };
  return (
    <div className="pre">
      <section className="card">
        <h3>🏟️ Set up a preseason game</h3>
        <div className="pre-form">
          <select value={f.away} onChange={set('away')} disabled={!canControl}><option value="">Away team</option>{getTeams().map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <span className="vs">@</span>
          <select value={f.home} onChange={set('home')} disabled={!canControl}><option value="">Home team</option>{getTeams().filter((t) => t.id !== f.away).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select value={f.win} onChange={set('win')} disabled={!canControl}><option value="">📺 Window (optional)</option>{WINDOWS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select>
          <input type="datetime-local" value={f.at} onChange={set('at')} disabled={!canControl} />
          <ConfirmButton className="btn small" label="Add game" disabled={!canControl || !f.home || !f.away} title="Add this preseason game?" yes="Add it"
            text="Every coach gets a notice, and it shows on the Live tab." onConfirm={() => act(async () => {
              await createPreseason(f.home, f.away, f.at ? new Date(f.at).toISOString() : null, f.win); setF({ home: '', away: '', win: '', at: '' });
            })} />
        </div>
        {error && <p className="form-error">{error}</p>}
      </section>
      <section className="card">
        <h3>Preseason games <span className="count">{games.length}</span></h3>
        {games.length ? (
          <ul className="pre-list">{games.map((g) => (
            <li key={g.id}><GameOdds game={g} /><span className="dim">{g.starts_at ? new Date(g.starts_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No kickoff yet'}</span>
              {canControl && g.status === 'scheduled' && <ConfirmButton className="btn small ghost" label="Remove" title="Remove this game?" yes="Remove" text="It disappears from the Live tab." onConfirm={() => act(() => deletePreseason(g.id))} />}</li>
          ))}</ul>
        ) : <p className="dim">No preseason games yet. Most seasons won't have any, and that's fine.</p>}
      </section>
    </div>
  );
}
