import React from 'react';
import BreakShow from './BreakShow.jsx';

// End of regulation, still tied: a full-screen overtime rules break (about 30 seconds) in the network's style. Simple cards,
// each with a little animation showing the rule: the coin toss and who gets it first, both teams starting at the other's
// 25, no game clock with one timeout each, the two-point rule from the 2nd overtime, and the shootout from the 3rd. Then the
// transition back and overtime starts. first: the side that gets the ball first. score: the tied score.
function MiniField({ team, other, mode }) {
  return (
    <div className={`otf otf-${mode}`} style={{ '--tc': team.color, '--oc': other.color }}>
      <div className="otf-ez left" /><div className="otf-ez right"><img src={other.logo} alt="" /></div>
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => <i key={y} className="otf-yd" style={{ left: `${8.33 + y * 0.8333}%` }}>{y <= 50 ? y : 100 - y}</i>)}
      <i className="otf-25" />
      <span className="otf-ball"><img src={team.logo} alt="" /></span>
      {mode === 'two' && <b className="otf-two hf">+2</b>}
    </div>
  );
}
const Card = ({ n, title, text, children }) => (
  <div className="ot-card"><span className="ot-n hf">Rule {n}</span><b className="ot-title hf">{title}</b><div className="ot-demo">{children}</div><p>{text}</p></div>
);

export default function OvertimeRules({ teams, first, score, bc, onReveal, onDone }) {
  const a = teams[first], b = teams[first === 'home' ? 'away' : 'home'];
  const steps = [
    { ms: 4600, render: () => (
      <div className="ot-head"><img className="ht-net" src={bc.prime ? bc.show.logo : bc.net.logo} alt="" /><h2 className="hf">Overtime</h2>
        <div className="ht-score">{['away', 'home'].map((k) => <div key={k} className="ht-team" style={{ '--tc': teams[k].color }}><img src={teams[k].logo} alt="" /><b className="hf">{score[k]}</b><span>{teams[k].code}</span></div>)}</div>
        <small>Tied after regulation · college overtime rules</small></div>) },
    { ms: 5000, render: () => (
      <Card n={1} title="The coin toss" text={`${a.name} get the ball first.`}>
        <div className="ot-coin"><span className="ot-coin-in"><img src={b.logo} alt="" /><img src={a.logo} alt="" /></span></div>
      </Card>) },
    { ms: 5600, render: () => (
      <Card n={2} title="Start at the 25" text="Each team gets one possession, starting at the other team's 25-yard line.">
        <MiniField team={a} other={b} mode="drive" />
      </Card>) },
    { ms: 4600, render: () => (
      <Card n={3} title="No game clock" text="The clock doesn't run in overtime. Each team gets one timeout per overtime.">
        <div className="ot-clock"><b className="hf">--:--</b><span className="ot-to"><i /><small>1 timeout each</small></span></div>
      </Card>) },
    { ms: 5600, render: () => (
      <Card n={4} title="Still tied? Go again" text="Tied after both possessions means another overtime. From the 2nd overtime on, a touchdown has to go for two.">
        <MiniField team={b} other={a} mode="two" />
      </Card>) },
    { ms: 5000, render: () => (
      <Card n={5} title="The shootout" text="From the 3rd overtime, the teams trade two-point tries until one of them leads.">
        <div className="ot-shoot">{[a, b, a, b].map((t, k) => <span key={k} style={{ animationDelay: `${0.3 + k * 0.7}s`, '--tc': t.color }}><img src={t.logo} alt="" /><b className="hf">{['✓', '✓', '✗', '✓'][k]}</b></span>)}</div>
      </Card>) },
  ];
  return <BreakShow net={bc.net} steps={steps} onReveal={onReveal} onDone={onDone} className="ot" />;
}
