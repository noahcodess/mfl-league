import React from 'react';
import Headshot from './Headshot.jsx';
import MoodTag from './MoodTag.jsx';
import { useTeamMorale, useTradeRequests, useTradeDeadline, MOODS, MOOD_NAMES, moodRank } from '../data/morale.js';
import { untilText, whenText } from '../data/schedule.js';

// My Team → Overview → Locker room: how many players feel each way, anyone who asked for a trade (with the deadline),
// and who to keep an eye on (upset now or heading that way) with the main reason.
export default function LockerRoom({ team, players, onOpen }) {
  const morale = useTeamMorale(players.map((p) => p.id));
  const requests = (useTradeRequests() || []).filter((r) => r.teamId === team.id);
  const deadline = useTradeDeadline();
  const counts = Object.fromEntries(MOODS.map((m) => [m, players.filter((p) => (p.mood || 'normal') === m).length]));
  const asked = new Set(requests.map((r) => r.playerId));
  const watch = players
    .map((p) => ({ p, m: morale?.get(p.id) }))
    .filter(({ p, m }) => !asked.has(p.id) && (moodRank(p.mood) <= 1 || (m && moodRank(m.target) < moodRank(p.mood) && moodRank(m.target) <= 2)))
    .sort((a, b) => moodRank(a.p.mood) - moodRank(b.p.mood) || b.p.stars - a.p.stars)
    .slice(0, 6);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  return (
    <section className="card locker">
      <header className="locker-head"><h3>🚪 Locker room</h3><span className="dim">How your players feel</span></header>
      <div className="locker-counts">
        {MOODS.map((m) => <div key={m} className={`lc lc-${m}${counts[m] ? '' : ' zero'}`}><MoodTag mood={m} size={30} iconOnly /><b>{counts[m]}</b><small>{MOOD_NAMES[m]}</small></div>)}
      </div>
      {requests.map((r) => byId[r.playerId] && (
        <button key={r.id} className="locker-req" onClick={() => onOpen(byId[r.playerId])}>
          <Headshot player={byId[r.playerId]} team={team} size={40} />
          <span><b>📣 {byId[r.playerId].name} wants out</b><small>Locked on your trade block. Trade him or he's cut at the deadline.</small></span>
          <span className="locker-clock">⏰ {deadline ? untilText(new Date(deadline) - Date.now()) : 'Week 8'}<small>{deadline ? whenText(deadline) : 'deadline'}</small></span>
        </button>
      ))}
      {watch.length > 0 ? (
        <>
          <h4>Keep an eye on</h4>
          <ul className="locker-watch">
            {watch.map(({ p, m }) => {
              const why = (m?.reasons || []).find((r) => r.v < 0);
              return (
                <li key={p.id}><button onClick={() => onOpen(p)}>
                  <MoodTag mood={p.mood || 'normal'} size={26} iconOnly />
                  <span><b>{p.position} {p.name}</b><small>{why ? `${why.icon} ${why.text}` : 'Not happy right now'}</small></span>
                  {m && m.target !== p.mood && <span className="locker-trend">↘ {MOOD_NAMES[m.target]}</span>}
                </button></li>
              );
            })}
          </ul>
        </>
      ) : !requests.length && <p className="dim">Nobody's upset. Keep winning and keep your starters starting.</p>}
    </section>
  );
}
