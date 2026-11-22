import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { usePlayerHistory, DEAL_SOURCE } from '../data/playerHistory.js';
import { getTeam, currentSeason } from '../data/teams.js';
import { money } from '../lib/format.js';

const LEFT = { let_go: 'Not re-signed', talks_failed: 'Contract talks fell apart', walked: 'Walked in free agency', released: 'Released' };
const span = (a, b) => (a === b ? `Season ${a}` : `Season ${a}–${b}`);

// His teams in order (oldest first): one per stretch with a team, split wherever he was traded (the deal goes with him).
function stretches(stints, moves, player) {
  const segs = stints.map((s) => ({ teamId: s.teamId, from: s.from, to: s.to, deal: s.deals[s.deals.length - 1], how: DEAL_SOURCE[s.deals[0]?.source] }));
  const first = segs[0]?.from ?? Infinity, older = [];
  [...moves].reverse().forEach((m) => {   // trades, oldest first
    if (m.season == null || m.season < first) { older.push(m); return; }
    const i = segs.findIndex((g) => g.teamId === m.from && g.from <= m.season && m.season <= g.to);
    if (i < 0 || segs.some((g) => g.teamId === m.to && g.from === m.season)) return;
    const g = segs[i]; segs.splice(i + 1, 0, { teamId: m.to, from: m.season, to: g.to, deal: g.deal, how: `Traded from the ${getTeam(m.from)?.name || m.from}` }); g.to = m.season; g.out = `Traded to the ${getTeam(m.to)?.name || m.to}`;
  });
  segs.forEach((g, k) => {
    const last = k === segs.length - 1;
    g.now = last && g.teamId === player.teamId; if (g.now) g.to = Math.max(g.from, currentSeason());
    if (last && !g.now && !g.out) g.out = LEFT[player.leftHow] || (player.status === 'retired' ? 'Retired' : 'Left');
  });
  return { segs, older };
}

// "History" tab, read bottom to top like a timeline: his college at the bottom, then his draft, then every team he's been
// on, newest at the top. Each team is its logo over a big bold "SEASON 7–8", with as little as possible beside it: the
// seasons and team, how he got there, his deal and his age then.
export default function PastTeams({ player }) {
  const history = usePlayerHistory(player);
  if (!history) return <p className="dim">Loading his history...</p>;
  const { segs, older } = stretches(history.stints, history.moves, player), d = history.drafted, ageAt = (s) => (player.age != null ? player.age - (currentSeason() - s) : null);
  const items = segs.map((g) => {
    const team = getTeam(g.teamId) || { name: g.teamId, code: g.teamId }, a = ageAt(g.from), b = ageAt(g.to);
    return (
      <li key={`${g.teamId}-${g.from}`} className={`ph-stint${g.now ? ' now' : ''}`} style={{ '--team': team.color || '#666' }}>
        {g.out && <div className="ph-link">⇡ {g.out}</div>}
        <div className="ph-card">
          <div className="ph-art"><span className="ph-big">{span(g.from, g.to)}</span><TeamBadge team={team} size="xl" /></div>
          <div className="ph-info">
            <b>{span(g.from, g.to)} · {team.name}</b>{g.now && <span className="career-tag">Now</span>}
            <small>{g.how || 'On the roster when the site started'}</small>
            {g.deal && <small>💰 {money(g.deal.perYear)}/yr · through Season {g.deal.lastSeason}</small>}
            {a != null && <small>🎂 Age {a === b ? a : `${a}–${b}`}</small>}
          </div>
        </div>
      </li>
    );
  }).reverse();
  return (
    <div className="ph">
      {!segs.length && <p className="dim">{player.status === 'prospect' ? 'Still in college: no MFL teams yet.' : 'No teams on record yet.'}</p>}
      {!player.teamId && segs.length > 0 && player.status !== 'retired' && <div className="ph-free">🆓 Free agent</div>}
      <ol className="ph-list">
        {items}
        {older.reverse().map((m) => <li key={m.id} className="ph-old">🔁 {m.season ? `Season ${m.season}: ` : ''}Traded {getTeam(m.from)?.name || m.from} → {getTeam(m.to)?.name || m.to}</li>)}
        {d && <li className="ph-step">🏈 Drafted · Season {d.season}, Round {d.round}, Pick {d.pick}{getTeam(d.teamId) ? ` by the ${getTeam(d.teamId).name}` : ''}</li>}
        {player.college && <li className="ph-step ph-college">🎓 {player.college}</li>}
      </ol>
    </div>
  );
}
