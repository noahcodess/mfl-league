import React, { useMemo } from 'react';
import BreakShow from './BreakShow.jsx';
import { HalfPlayer, StoryCard } from './HalftimeCards.jsx';
import { halfStory, teamLines, halfLeaders } from '../lib/halftimeStats.js';
import Headshot from './Headshot.jsx';

// The halftime report (about 35-45 seconds): transition, the network's halftime title with the score, the first-half team
// numbers (each network picks its own lines), transition, the player of the half, then up to three storylines, then back
// to the field for the second-half kickoff. Styled by the network around it, so every broadcast's report looks different.
// plays: the first half. score: at the half. people: id → player. sideOf: id → side. bc: the broadcast.
export default function HalftimeReport({ plays, score, teams, people, sideOf, bc, receiver, onReveal, onDone }) {
  const key = bc.prime ? bc.show.key : bc.net.key;
  const s = useMemo(() => halfStory(plays, sideOf, score), [plays, sideOf, score]);
  const lines = useMemo(() => teamLines(s.teams, key), [s.teams, key]);
  const star = s.potg && people[s.potg.player_id], starTeam = s.potg && teams[s.potg.team_id];
  const title = () => (
    <div className="ht-title">
      <img className="ht-net" src={bc.prime ? bc.show.logo : bc.net.logo} alt="" />
      <h2 className="hf">Halftime Report</h2>
      <div className="ht-score">
        {['away', 'home'].map((k) => <div key={k} className={`ht-team ${k}`} style={{ '--tc': teams[k].color }}><img src={teams[k].logo} alt="" /><b className="hf">{score[k]}</b><span>{teams[k].code}</span></div>)}
      </div>
      <small>End of the 1st half</small>
    </div>
  );
  const numbers = () => (
    <div className="ht-stats">
      <h3 className="hf">First half</h3>
      <div className="ht-heads">{['away', 'home'].map((k) => <span key={k}><img src={teams[k].logo} alt="" />{teams[k].code}</span>)}</div>
      {lines.map(([label, a, h, share], n) => (
        <div className="ht-line" key={label} style={{ animationDelay: `${0.25 + n * 0.35}s`, '--a': teams.away.color, '--h': teams.home.color, '--share': share }}>
          <b>{a}</b><div className="ht-bar"><i /><span><em>{label}</em></span></div><b>{h}</b>
        </div>
      ))}
    </div>
  );
  const lead = useMemo(() => halfLeaders(s.players, sideOf), [s.players, sideOf]);
  const leaders = () => (
    <div className="ht-leaders">
      <h3 className="hf">Leaders</h3>
      <div className="ht-lcols">{lead.map(({ side, rows }) => (
        <div key={side} className="ht-lcol" style={{ '--tc': teams[side].color }}>
          <span className="ht-lteam"><img src={teams[side].logo} alt="" />{teams[side].name}</span>
          {rows.map(([label, id, line], n) => people[id] && (
            <div className="ht-lrow" key={label} style={{ animationDelay: `${0.3 + n * 0.3}s` }}><Headshot player={people[id]} team={teams[side]} size={56} /><div><small>{label}</small><b>{people[id].name}</b><span>{line}</span></div></div>
          ))}
        </div>
      ))}</div>
      {receiver && <p className="ht-next">🏈 {teams[receiver].name} get the ball to start the second half</p>}
    </div>
  );
  const steps = [
    { ms: 5200, render: title },
    { ms: 9000, render: numbers },
    { sting: true },
    { ms: 8000, render: () => <HalfPlayer potg={s.potg} who={star} team={starTeam || teams.home} /> },
    ...s.stories.map((st) => ({ ms: 5200, render: () => <StoryCard st={st} people={people} teams={teams} /> })),
    { sting: true },
    { ms: 7500, render: leaders },
  ];
  return <BreakShow net={bc.net} steps={steps} onReveal={onReveal} onDone={onDone} className="ht" />;
}
