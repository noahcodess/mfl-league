import React, { useState } from 'react';
import { getTeams, getTeam } from '../data/teams.js';
import { useGameLineups } from '../data/gameLineups.js';
import { overall } from '../lib/simLineup.js';

const feet = (h) => (h ? `${Math.floor(h / 12)}'${h % 12}"` : '?');
const MOOD = { unhappy: '😕', angry: '😠' };

function Side({ team, lineup }) {
  const row = ({ key, player: p }) => (
    <tr key={key} className={p ? (p.starter ? '' : 'lc-fill') : 'lc-empty'}>
      <td>{key}</td><td>{p ? `${p.name} ${MOOD[p.mood] || ''}` : 'Empty'}</td><td>{p ? `${p.stars}★` : ''}</td><td>{p ? overall(p) : ''}</td>
      <td>{p ? `${feet(p.height)} · ${p.weight || '?'} lb` : ''}</td><td>{p?.durability ?? ''}</td>
    </tr>
  );
  const head = <thead><tr><th>Spot</th><th>Player</th><th>Stars</th><th>Avg</th><th>Size</th><th>Dur</th></tr></thead>;
  return (
    <div className="lc-side" style={{ '--tc': team.color }}>
      <h4>{team.name} <small>Offense {lineup.strength.off} · Defense {lineup.strength.def}</small></h4>
      <table className="lc-table">{head}<tbody><tr className="lc-sec"><td colSpan="6">Offense</td></tr>{lineup.offense.map(row)}<tr className="lc-sec"><td colSpan="6">Defense</td></tr>{lineup.defense.map(row)}</tbody></table>
      <div className="lc-units">
        {Object.values(lineup.kickTeams).map((u) => (
          <p key={u.label}><b>{u.label}{u.returner ? ` (returner: ${u.returner.name})` : ''}{u.holder ? ` (holder: ${u.holder.name})` : ''}:</b> {u.players.map((p) => `${p.pos} ${p.last}`).join(', ')}</p>
        ))}
      </div>
      {lineup.problems.length > 0 && <ul className="lc-problems">{lineup.problems.map((t) => <li key={t}>⚠️ {t}</li>)}</ul>}
    </div>
  );
}

// Commissioner's Desk → Test: the game engine's view of any matchup before a snap is played. Both teams' 10 starters on each
// side of the ball with their size and injury rating, the kick teams the engine picked, and anything wrong with a lineup.
export default function LineupCheck() {
  const teams = getTeams().slice().sort((a, b) => a.name.localeCompare(b.name));
  const [away, setAway] = useState('edc'), [home, setHome] = useState('snm'), lineups = useGameLineups(home, away);
  const pick = (value, set) => <select value={value} onChange={(e) => set(e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>;
  return (
    <section className="card crowd-test">
      <h3>🏈 Game-day lineups</h3>
      <p>What the game engine sees for a matchup: 10 on 10, picked from each roster's starters. Gold rows are backups filling an empty starting spot. Avg is the average of his 10 ratings; Dur is durability.</p>
      <div className="ct-row"><label>Away{pick(away, setAway)}</label><label>Home{pick(home, setHome)}</label></div>
      {!lineups ? <p className="dim">Loading ratings…</p> : (
        <div className="lc-grid"><Side team={getTeam(away)} lineup={lineups.away} /><Side team={getTeam(home)} lineup={lineups.home} /></div>
      )}
    </section>
  );
}
