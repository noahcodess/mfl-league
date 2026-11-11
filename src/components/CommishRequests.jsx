import React, { useState } from 'react';
import Headshot from './Headshot.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { useTradeRequests, useTradeDeadline, cancelTradeRequest } from '../data/morale.js';
import { untilText, whenText } from '../data/schedule.js';
import { getAllPlayers } from '../data/players.js';
import { getTeam } from '../data/teams.js';

// Commissioner's Desk → Trades: every open trade request with the deadline, and a button to call one off.
export default function CommishRequests({ canControl }) {
  const [version, setVersion] = useState(0);
  const list = useTradeRequests(version);
  const deadline = useTradeDeadline();
  const byId = Object.fromEntries(getAllPlayers().map((p) => [p.id, p]));
  return (
    <section className="creqs">
      <h3>📣 Trade requests <span className="count">{list?.length ?? 0}</span></h3>
      <p className="dim">Deadline: {deadline ? `${whenText(deadline)} (${untilText(new Date(deadline) - Date.now())})` : 'not set, so after Week 8'}. Anyone still here then is cut. Make a player ask out from his editor in the Players tab.</p>
      {!list?.length && <p className="dim">Nobody has asked out.</p>}
      {(list || []).map((r) => {
        const p = byId[r.playerId]; const t = getTeam(r.teamId);
        if (!p) return null;
        return (
          <div key={r.id} className="creq" style={{ '--team': t?.color }}>
            <Headshot player={p} team={t} size={40} />
            <span><b>{p.position} {p.name}</b><small>{t?.name} · {r.madeBy === 'commissioner' ? 'Set by you' : `Asked out when ${r.mood}`} · {new Date(r.at).toLocaleDateString()}</small></span>
            <ConfirmButton className="btn small ghost" label="Call it off" disabled={!canControl} title={`Call off ${p.name}'s trade request?`} yes="Call it off"
              text="He comes off the trade block and won't be cut. His mood stays the same." onConfirm={async () => { await cancelTradeRequest(r.id); setVersion((v) => v + 1); }} />
          </div>
        );
      })}
    </section>
  );
}
