import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';

// League feed: the current record holders from the last finished season (champion, runner-up, best record,
// best offense, best defense). Grows into all-time records as seasons are played on the site.
export default function RecordsCard({ results, season }) {
  if (!results?.length) return null;
  const by = (fn) => [...results].sort(fn)[0];
  const rows = [
    ['🏆', 'Craft Bowl champion', results.find((r) => r.playoff === 'champion'), (r) => `${r.wins}-${r.losses}`],
    ['🥈', 'Craft Bowl runner-up', results.find((r) => r.playoff === 'craft_bowl_loss'), (r) => `${r.wins}-${r.losses}`],
    ['📈', 'Best record', by((a, b) => b.wins - a.wins || a.losses - b.losses), (r) => `${r.wins}-${r.losses}`],
    ['🔥', 'Most points scored', by((a, b) => (b.pf || 0) - (a.pf || 0)), (r) => `${r.pf} pts`],
    ['🧱', 'Fewest points allowed', by((a, b) => (a.pa ?? 1e9) - (b.pa ?? 1e9)), (r) => `${r.pa} allowed`],
  ].filter((r) => r[2]);
  return (
    <article className="feed-card">
      <header><span className="feed-icon">🏅</span><div><b>Record holders</b><small>Season {season}</small></div></header>
      <ul className="feed-records">
        {rows.map(([icon, label, r, val]) => {
          const t = getTeam(r.teamId);
          return (
            <li key={label} style={{ '--team': t?.color }}>
              <span className="fr-icon">{icon}</span>
              <div><small>{label}</small><b>{t && <TeamBadge team={t} size="sm" />}{t?.name}</b></div>
              <em>{val(r)}</em>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
