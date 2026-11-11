import React, { useState } from 'react';
import { OFFENSES, DEFENSES, schemeInfo, autoScheme } from '../lib/schemes.js';
import { saveMyScheme } from '../data/coaches.js';
import { store } from '../data/store.js';

// The coach's scheme, kept simple: an Auto switch, then one row of choices for offense and one for defense, with a line
// explaining the one that's picked. Plays get called mostly by game situation, then by the scheme.
export default function CoachScheme({ coach, team, mine, onSaved }) {
  const roster = store.league.players.filter((p) => p.teamId === team.id && (p.status ?? 'active') === 'active');
  const auto = autoScheme(roster);
  const s = coach.scheme || {};
  const [pick, setPick] = useState({ auto: s.auto !== false, offense: s.offense || 'balanced', defense: s.defense || 'balanced' });
  const [msg, setMsg] = useState('');
  const shown = pick.auto ? auto : pick;
  const changed = pick.auto !== (s.auto !== false) || (!pick.auto && (pick.offense !== s.offense || pick.defense !== s.defense));
  const save = async () => { try { await saveMyScheme(pick.offense, pick.defense, pick.auto); setMsg('Saved ✓'); onSaved?.(); } catch (e) { setMsg(e.message); } };
  const side = (label, icon, list, key) => {
    const [, name, what] = schemeInfo(list, shown[key]);
    return (
      <div className="sside">
        <div className="sside-head"><span>{icon} {label}</span><b key={shown[key]}>{name}</b></div>
        <p className="sside-what" key={`w-${shown[key]}`}>{what}</p>
        {mine && !pick.auto && (
          <div className="spills">
            {list.map(([id, n]) => <button key={id} type="button" className={pick[key] === id ? 'on' : ''} onClick={() => { setPick((p) => ({ ...p, [key]: id })); setMsg(''); }}>{n}</button>)}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="scheme">
      {mine && (
        <button type="button" className={`switch${pick.auto ? ' on' : ''}`} onClick={() => { setPick((p) => ({ ...p, auto: !p.auto, offense: auto.offense, defense: auto.defense })); setMsg(''); }}>
          <i /><span><b>Auto</b> {pick.auto ? 'picks from your roster' : 'is off: you choose'}</span>
        </button>
      )}
      {pick.auto && <p className="dim scheme-why">Passing {auto.pass.toFixed(1)}★ vs run {auto.run.toFixed(1)}★ · pass rush {auto.rush.toFixed(1)}★ vs coverage {auto.cover.toFixed(1)}★</p>}
      {side('Offense', '🏈', OFFENSES, 'offense')}
      {side('Defense', '🛡️', DEFENSES, 'defense')}
      {mine && (changed || msg) && <div className="confirm-actions">{msg && <span className={msg.startsWith('Saved') ? 'good' : 'bad'}>{msg}</span>}{changed && <button className="btn" onClick={save}>Save scheme</button>}</div>}
    </div>
  );
}
