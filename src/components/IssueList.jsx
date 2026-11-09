import React from 'react';

// A list of import problems; level says whether it needs fixing, info, or an answer.
const LEVEL = { fix: 'Fix', need: 'Missing', ask: 'Question' };

export default function IssueList({ issues, teamName }) {
  if (!issues.length) return <p className="dim">Nothing flagged.</p>;
  return (
    <ul className="issues">
      {issues.map((i, n) => (
        <li key={n}>
          <span className={`lvl lvl-${i.level}`}>{LEVEL[i.level]}</span>
          <span>{teamName && i.teamId ? <strong>{teamName(i.teamId)}: </strong> : null}{i.text}</span>
        </li>
      ))}
    </ul>
  );
}
