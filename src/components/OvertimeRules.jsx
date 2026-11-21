import React from 'react';
import BreakShow from './BreakShow.jsx';
import { Coin, Turns, MiniField, Shootout } from './OvertimeDemos.jsx';

// End of regulation, still tied: a full-screen overtime rules break (about 35 seconds) in the network's style. One plain
// card per rule, each with a little demo: one coin toss, then the teams take turns going first; a turn is one possession
// from the other team's 30; no game clock (24-second play clock, one timeout); OT2 touchdowns go for two; from OT3 it's a
// two-point shootout where every round is a new overtime, for as long as it takes. Then the transition back and overtime
// starts. first: the side that gets the ball first. score: the tied score.
const Card = ({ n, title, text, children }) => (
  <div className="ot-card"><span className="ot-n hf">Rule {n} of 6</span><b className="ot-title hf">{title}</b><div className="ot-demo">{children}</div><p>{text}</p></div>
);

export default function OvertimeRules({ teams, first, score, bc, onReveal, onDone }) {
  const a = teams[first], b = teams[first === 'home' ? 'away' : 'home'];
  const steps = [
    { ms: 4200, render: () => (
      <div className="ot-head"><img className="ht-net" src={bc.prime ? bc.show.logo : bc.net.logo} alt="" /><h2 className="hf">Overtime</h2>
        <div className="ht-score">{['away', 'home'].map((k) => <div key={k} className="ht-team" style={{ '--tc': teams[k].color }}><img src={teams[k].logo} alt="" /><b className="hf">{score[k]}</b><span>{teams[k].code}</span></div>)}</div>
        <small>Tied after four quarters · here's how overtime works</small></div>) },
    { ms: 5000, render: () => (
      <Card n={1} title="One coin toss" text={`${a.name} won the toss, so they go first. That's the only toss all game.`}>
        <Coin win={a} lose={b} />
      </Card>) },
    { ms: 6200, render: () => (
      <Card n={2} title="Then take turns" text="Every overtime, each team gets one turn with the ball. Whoever went second goes first next time.">
        <Turns a={a} b={b} />
      </Card>) },
    { ms: 5600, render: () => (
      <Card n={3} title="Start at the 30" text="A turn is one drive from the other team's 30-yard line. Outscore them in the round and you win.">
        <MiniField team={a} other={b} mode="drive" />
      </Card>) },
    { ms: 4800, render: () => (
      <Card n={4} title="No game clock" text="The game clock is off in overtime. Only the 24-second play clock runs. One timeout per team, each overtime.">
        <div className="ot-clock"><span className="ot-face"><small>Game clock</small><b className="hf">--:--</b></span><span className="ot-pc"><small>Play clock</small><b className="hf">24</b></span><span className="ot-to"><i /><small>1 timeout</small></span></div>
      </Card>) },
    { ms: 5000, render: () => (
      <Card n={5} title="OT2: go for two" text="Still tied after OT? In OT2, a touchdown has to go for two. No extra-point kicks.">
        <MiniField team={b} other={a} mode="two" />
      </Card>) },
    { ms: 6400, render: () => (
      <Card n={6} title="OT3 on: shootout" text="From OT3 on, each team gets one two-point try. Every round is a new overtime (OT3, OT4, OT5...) until somebody wins. No limit.">
        <Shootout a={a} b={b} />
      </Card>) },
  ];
  return <BreakShow net={bc.net} steps={steps} onReveal={onReveal} onDone={onDone} className="ot" />;
}
