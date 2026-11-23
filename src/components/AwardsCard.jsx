// The League tab's awards card: last season's finalists for every award (the top 3; the winner is revealed at the award
// ceremony), shown until the week the commissioner picked.
import React from 'react';
import { AWARDS } from '../lib/awardRank.js';
import { useShownAwards } from '../data/awards.js';
import { getTeam } from '../data/teams.js';

export default function AwardsCard() {
  const v = useShownAwards();
  if (!v) return null;
  return (
    <article className="feed-card aw-feed">
      <header><span className="feed-icon">🏆</span><div><b>Season {v.season} awards</b><small>The finalists for every award</small></div></header>
      {AWARDS.filter((a) => v.lists[a.key]?.entries?.length).map((a) => (
        <div key={a.key} className="aw-feed-row">
          <b>{a.icon} {a.name}</b>
          <ol>{v.lists[a.key].entries.slice(0, 3).map((r) => { const t = r.team && getTeam(r.team); return <li key={r.id}>{t && <img src={t.logo} alt="" />}<span>{r.name}</span>{r.pos && <small>{r.pos}</small>}</li>; })}</ol>
        </div>
      ))}
    </article>
  );
}
