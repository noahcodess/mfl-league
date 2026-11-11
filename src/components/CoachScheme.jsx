import React, { useState } from 'react';
import { OFFENSES, DEFENSES, schemeName, autoScheme } from '../lib/schemes.js';
import { saveMyScheme } from '../data/coaches.js';
import { store } from '../data/store.js';

// The coach's scheme: pick an offense and a defense, or Auto (reads the roster). Plays get called mostly by game situation,
// then by the scheme. Other teams' coaches show theirs read-only.
export default function CoachScheme({ coach, team, mine, onSaved }) {
  const roster = store.league.players.filter((p) => p.teamId === team.id && (p.status ?? 'active') === 'active');
  const auto = autoScheme(roster);
  const s = coach.scheme || { auto: true, offense: 'balanced', defense: 'balanced' };
  const [pick, setPick] = useState({ auto: s.auto !== false, offense: s.offense, defense: s.defense });
  const [msg, setMsg] = useState('');
  const live = pick.auto ? auto : pick;
  const save = async () => { try { await saveMyScheme(pick.offense, pick.defense, pick.auto); setMsg('Saved ✓'); onSaved?.(); } catch (e) { setMsg(e.message); } };
  const row = (list, key) => (
    <div className="schemes">
      {list.map(([id, label, what]) => (
        <button key={id} type="button" disabled={!mine || pick.auto} className={live[key] === id ? 'on' : ''} onClick={() => setPick((p) => ({ ...p, [key]: id }))}>
          <b>{label}</b><small>{what}</small>
        </button>
      ))}
    </div>
  );
  return (
    <div className="scheme">
      <div className="scheme-now">
        <span>🏈 Offense: <b>{schemeName(OFFENSES, live.offense)}</b></span>
        <span>🛡️ Defense: <b>{schemeName(DEFENSES, live.defense)}</b></span>
        {pick.auto && <span className="auto-tag">AUTO</span>}
      </div>
      {mine && (
        <label className="auto-toggle">
          <input type="checkbox" checked={pick.auto} onChange={(e) => setPick((p) => ({ ...p, auto: e.target.checked }))} />
          <span><b>Auto</b>: pick the scheme from my roster</span>
        </label>
      )}
      {pick.auto && <p className="dim">{auto.why}</p>}
      <h4>Offense</h4>{row(OFFENSES, 'offense')}
      <h4>Defense</h4>{row(DEFENSES, 'defense')}
      {mine && <div className="confirm-actions">{msg && <span className={msg.startsWith('Saved') ? 'good' : 'bad'}>{msg}</span>}<button className="btn" onClick={save}>Save scheme</button></div>}
    </div>
  );
}
