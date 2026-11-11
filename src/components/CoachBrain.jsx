import React from 'react';
import { useCoachBrain } from '../data/coachBrain.js';
import { archetype, teamMode, VALUES, situationLines } from '../lib/botBrain.js';

// How tough this coach is to trade with, from his loyalty, aggression and type (matches the server's trade edge loosely).
function toughness(b = {}) {
  const e = 1.08 + ((b.loyalty ?? 3) - 3) * 0.02 - ((b.aggression ?? 3) - 3) * 0.01 + (b.archetype === 'old_school' ? 0.05 : 0);
  return e >= 1.12 ? ['Tough', 'bad'] : e <= 1.06 ? ['Flexible', 'good'] : ['Fair', 'gold'];
}

// The coach profile's Front Office tab: personality, team mode, what he values, how he reads his roster, and his trade style.
export default function CoachBrain({ teamId }) {
  const s = useCoachBrain(teamId);
  if (!s) return <p className="dim">Reading the room...</p>;
  const b = s.brain || {};
  const a = archetype(b.archetype);
  const m = teamMode(s.mode);
  const [tough, tone] = toughness(b);
  return (
    <div className="cbrain">
      {s.human && <p className="cbrain-note">👤 A real coach runs this team. When his draft clock runs out, Auto pick drafts the way this front office would.</p>}
      <div className="cbrain-cards">
        {!s.human && (
          <div className="cbrain-card">
            <span>Personality</span><b>{a.icon} {a.name}</b><p>{a.line}</p>
          </div>
        )}
        <div className="cbrain-card">
          <span>Team plan</span><b>{m.icon} {m.name}</b><p>{m.line}</p>
        </div>
      </div>
      {!s.human && !s.reserved && (
        <div className="cbrain-vals">
          <h4>What he values</h4>
          {VALUES.map(([k, label], i) => (
            <div key={k} className="cbrain-val" style={{ '--i': i }}>
              <span>{label}</span><div className="cbar"><i style={{ width: `${b.values?.[k] ?? 50}%` }} /></div>
            </div>
          ))}
        </div>
      )}
      <h4>How he sees his team</h4>
      <ul className="cbrain-list">{situationLines(s).map((l) => <li key={l}>{l}</li>)}</ul>
      {!!s.needs?.length && <div className="cbrain-needs"><span>Biggest needs</span>{s.needs.map((p) => <b key={p}>{p}</b>)}</div>}
      {!!s.future_needs?.length && <div className="cbrain-needs future"><span>Planning ahead (starters retiring soon, no heir yet)</span>{s.future_needs.map((p) => <b key={p}>{p}</b>)}</div>}
      {!s.human && (
        <div className="cbrain-trade">
          <span>Trading with him</span>
          {s.reserved ? <b>🪑 Commissioner decides</b> : <b className={tone}>{tough}</b>}
          <p className="dim">{a.trade}. Bots judge every offer by their plan, and want a little extra over a fair deal.</p>
        </div>
      )}
    </div>
  );
}
