import React from 'react';
import Headshot from './Headshot.jsx';

// The halftime report's player cards: the player of the half, and one card per storyline (a receiver cooking his man,
// a quarterback who can't miss, a back averaging big chunks, a pass rusher, a ballhawk, a defense giving up nothing).
const POS = { QB: 'Quarterback', RB: 'Running back', WR: 'Receiver', TE: 'Tight end', CB: 'Cornerback', SS: 'Safety', LB: 'Linebacker', DE: 'Defensive end', DT: 'Defensive tackle', DL: 'Defensive line', K: 'Kicker' };
const Num = ({ v, label, delay = 0 }) => <div className="htc-num" style={{ animationDelay: `${delay}s` }}><b>{v}</b><small>{label}</small></div>;

export function HalfPlayer({ potg, who, team }) {
  if (!potg || !who) return <div className="htc-empty hf">No standout yet. Anybody's game.</div>;
  return (
    <div className="htc-potg" style={{ '--tc': team.color, '--ta': team.accent }}>
      <span className="htc-kick hf">Player of the half</span>
      <div className="htc-card"><Headshot player={who} team={team} size={180} />
        <div><small>#{who.number ?? '-'} · {POS[who.pos] || who.pos}</small><b className="hf">{who.name}</b><span><img src={team.logo} alt="" />{team.name}</span></div>
      </div>
      <div className="htc-feat hf">{potg.feat}</div>
      <p className="htc-line">{potg.line}</p>
    </div>
  );
}

// One storyline. people: id → player. teams: { home, away }. after: the end-of-game show (the whole game, past tense).
export function StoryCard({ st, people, teams, after = false }) {
  const team = teams[st.side], p = people[st.id || st.off], vs = st.def && people[st.def], name = (x) => x?.last || x?.name || '?';
  const body = {
    duel: () => ({ tag: 'Matchup cooking 🔥', title: <><small className="htc-pos">{p?.pos}</small>{name(p)} <i>vs</i> <small className="htc-pos">{vs?.pos}</small>{name(vs)}</>, nums: [[st.rec, 'Catches'], [st.yds, 'Yards'], [st.td, 'TD'], [`${st.rec}/${st.tgt}`, 'On targets']], line: `${p?.name || 'He'} has owned ${vs?.name || 'his man'} so far.` }),
    qb: () => ({ tag: 'Can\'t miss', title: name(p), nums: [[`${st.cmp}/${st.att}`, 'Comp/Att'], [`${Math.round((st.cmp / st.att) * 100)}%`, 'Comp %'], [st.yds, 'Yards'], [st.td, 'TD']], line: 'Picking the defense apart.' }),
    rb: () => ({ tag: 'Big chunks', title: name(p), nums: [[st.ypc.toFixed(1), 'Yds / carry'], [st.car, 'Carries'], [st.yds, 'Yards'], [st.td, 'TD']], line: st.ypc >= 10 ? 'Double digits a carry. That\'s absurd.' : 'Every carry is moving the chains.' }),
    rush: () => ({ tag: 'Living in the backfield', title: name(p), nums: [[st.sacks, 'Sacks'], [st.pres, 'Pressures']], line: 'The line has no answer for him.' }),
    pick: () => ({ tag: 'Ballhawk', title: name(p), nums: [[st.n, st.n > 1 ? 'Interceptions' : 'Interception']], line: 'Turned the game with the ball in the air.' }),
    wall: () => ({ tag: 'Brick wall', title: team.name, nums: [[st.yds, 'Yards allowed'], [st.plays, 'Plays faced']], line: 'Nothing is getting through.' }),
  }[st.kind]();   // only the card being shown is built
  if (after) body.line = { duel: `${p?.name || 'He'} owned ${vs?.name || 'his man'} all game.`, qb: 'Picked the defense apart all game.', rb: 'Moved the chains every time he touched it.',
    rush: 'The line never had an answer for him.', pick: 'Turned the game with the ball in the air.', wall: 'Nothing got through all game.' }[st.kind];
  return (
    <div className="htc-story" style={{ '--tc': team.color, '--ta': team.accent }}>
      <span className="htc-kick hf">{body.tag}</span>
      <div className="htc-who">
        {p ? <Headshot player={p} team={team} size={120} /> : <img className="htc-logo" src={team.logo} alt="" />}
        {vs && <><span className="htc-vs hf">VS</span><Headshot player={vs} team={teams[st.side === 'home' ? 'away' : 'home']} size={120} /></>}
      </div>
      <b className="htc-title hf">{body.title}</b>
      <div className="htc-nums">{body.nums.map(([v, l], k) => <Num key={l} v={v} label={l} delay={0.4 + k * 0.25} />)}</div>
      <p className="htc-line">{body.line}</p>
    </div>
  );
}
