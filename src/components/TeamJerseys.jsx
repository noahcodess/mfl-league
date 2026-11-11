import React, { useState } from 'react';
import JerseyCard from './JerseyCard.jsx';
import JerseyEditor from './JerseyEditor.jsx';
import { useJerseys, usePendingJerseys, setJersey, decideJersey } from '../data/jerseys.js';
import { getPlayers } from '../data/players.js';

// Commissioner's Desk → Teams → a team → Jerseys: all four uniforms. He edits them directly (no request), and can approve or deny
// a coach's pending change right here too.
export default function TeamJerseys({ team, canControl }) {
  const [version, setVersion] = useState(0);
  const jerseys = useJerseys(team, version);
  const pending = usePendingJerseys(team.id, version);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const model = getPlayers(team.id).find((p) => p.position === 'QB' && p.depth === 'starter') || getPlayers(team.id)[0];
  const decide = async (id, ok) => { setErr(''); try { await decideJersey(id, ok, team.id); setVersion((v) => v + 1); } catch (e) { setErr(e.message); } };
  return (
    <section className="te-jerseys">
      <b>Jerseys</b>
      <small className="dim">Home and Away keep their names. The home team always wears the darker uniform.</small>
      {editing ? (
        <JerseyEditor team={team} jersey={editing} model={model} submitLabel="Save jersey"
          onSubmit={(name, colors) => setJersey(team.id, editing.slot, name, colors)} onClose={(ok) => { if (ok) setVersion((v) => v + 1); setEditing(null); }} />
      ) : (
        <div className="jersey-grid">
          {jerseys.map((j) => {
            const p = pending.find((x) => x.slot === j.slot);
            return (
              <div key={j.slot}>
                <JerseyCard jersey={j} model={model} pending={p} onEdit={canControl ? () => setEditing(j) : null} />
                {p && canControl && <div className="je-decide"><button className="btn small good" onClick={() => decide(p.id, true)}>Approve</button><button className="btn small ghost" onClick={() => decide(p.id, false)}>Deny</button></div>}
              </div>
            );
          })}
        </div>
      )}
      {err && <p className="form-error">{err}</p>}
    </section>
  );
}
