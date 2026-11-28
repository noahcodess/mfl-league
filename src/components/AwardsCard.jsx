// The League tab's awards card. In season (through the week picked in Desk → Awards): the award race, the top 3 of every
// award in order. After that week it hides the names ("revealed at the award ceremony") until the ceremony is over, then
// shows the winners (🏆) with the other finalists. In the offseason: last season's winners and finalists.
import React from 'react';
import { AWARDS } from '../lib/awardRank.js';
import { useAwardRace } from '../data/awards.js';
import { useCeremony } from '../data/ceremony.js';
import { getTeam, currentSeason } from '../data/teams.js';

export default function AwardsCard() {
  const cer = useCeremony(currentSeason()), v = useAwardRace(cer);
  if (!v) return null;
  if (v.mode === 'hidden') {
    return (
      <article className="feed-card aw-feed">
        <header><span className="feed-icon">🏆</span><div><b>Season {v.season} award race</b><small>The race is closed</small></div></header>
        <p className="aw-feed-hide">🔒 The finalists are locked in. Awards will be revealed at the award ceremony.</p>
      </article>
    );
  }
  const race = v.mode === 'race', shown = AWARDS.filter((a) => v.lists[a.key]?.length);
  if (!shown.length) return null;
  return (
    <article className="feed-card aw-feed">
      <header><span className="feed-icon">🏆</span><div><b>Season {v.season} {race ? 'award race' : 'awards'}</b><small>{race ? 'The top 3 in every race right now' : 'Winners and finalists'}</small></div></header>
      {shown.map((a) => (
        <div key={a.key} className="aw-feed-row">
          <b>{a.icon} {a.name}</b>
          <ol>{v.lists[a.key].slice(0, 3).map((r, n) => { const t = r.team && getTeam(r.team); return <li key={r.id} className={!race && n === 0 ? 'won' : ''}>{t && <img src={t.logo} alt="" />}<span>{r.name}</span>{r.pos && <small>{r.pos}</small>}{!race && n === 0 && <em>🏆 Winner</em>}</li>; })}</ol>
        </div>
      ))}
    </article>
  );
}
