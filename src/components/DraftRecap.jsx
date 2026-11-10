import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import GradeStamp from './GradeStamp.jsx';
import { getTeam } from '../data/teams.js';
import { links } from '../lib/router.js';

const POINTS = { 'A+': 12, A: 11, 'A-': 10, 'B+': 9, B: 8, 'B-': 7, 'C+': 6, C: 5, 'C-': 4, 'D+': 3, D: 2, 'D-': 1, F: 0 };
const LETTERS = Object.entries(POINTS).sort((a, b) => b[1] - a[1]);
const overall = (list) => {
  const avg = list.reduce((s, p) => s + (POINTS[p.grade] ?? 5), 0) / (list.length || 1);
  return LETTERS.find(([, v]) => avg >= v - 0.5)?.[0] || 'F';
};

// After the last pick: "Draft complete", then each team's haul with a class grade (best class first).
export default function DraftRecap({ season, picks }) {
  const teams = {};
  picks.forEach((p) => { (teams[p.team_id] ||= []).push(p); });
  const rows = Object.entries(teams).map(([id, list]) => ({ id, list, grade: overall(list) }))
    .sort((a, b) => (POINTS[b.grade] - POINTS[a.grade]) || a.list[0].pick_no - b.list[0].pick_no);
  return (
    <section className="recap">
      <div className="recap-banner"><span>Season {season}</span><h2>Draft complete</h2><small>{picks.length} players drafted · everyone else is now a free agent</small></div>
      <div className="recap-grid">
        {rows.map(({ id, list, grade }, i) => {
          const team = getTeam(id) || { name: id, code: id };
          return (
            <a key={id} className="recap-team" href={links.team(id)} style={{ '--team': team.color, '--i': i }}>
              <div className="recap-head"><TeamBadge team={team} size="md" /><b>{team.name}</b><GradeStamp grade={grade} size="sm" /></div>
              <ul>{list.map((p) => <li key={p.pick_no}><span>#{p.pick_no}</span> {p.player?.name} <small>{p.player?.position}</small> {p.grade && <em>{p.grade}</em>}</li>)}</ul>
            </a>
          );
        })}
      </div>
    </section>
  );
}
