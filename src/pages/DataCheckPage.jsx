import React from 'react';
import IssueList from '../components/IssueList.jsx';
import { getIssues } from '../data/issues.js';
import { getTeam } from '../data/teams.js';

// Commissioner view of everything the import flagged, grouped by type.
const GROUPS = [
  ['ratings', 'Missing ratings', 'These posts were pasted as plain text, so the star emojis and moods dropped out.'],
  ['cap', 'Over the salary cap', 'Cap hit is total contract ÷ years, counting only deals that cover the coming season.'],
  ['player', 'Player data problems', 'Typos, and lineup posts that disagree with the expanded roster posts.'],
  ['team', 'Roster problems', null],
  ['pick', 'Draft pick problems', null],
  ['duplicate', 'Same name on more than one team', 'Are these the same person, or different players who share a name? The site gives every player an ID either way.'],
];

export default function DataCheckPage() {
  const issues = getIssues();
  const name = (id) => getTeam(id)?.name || id;
  return (
    <div>
      <div className="page-head">
        <h1>Data Check</h1>
        <p className="dim">{issues.length} things flagged while importing the Discord rosters. Fixing them at the source and re-importing clears them.</p>
      </div>
      {GROUPS.map(([kind, title, help]) => {
        const rows = issues.filter((i) => i.kind === kind);
        if (!rows.length) return null;
        return (
          <section className="card" key={kind}>
            <h3>{title} <span className="count">{rows.length}</span></h3>
            {help && <p className="dim help">{help}</p>}
            <IssueList issues={rows} teamName={name} />
          </section>
        );
      })}
    </div>
  );
}
