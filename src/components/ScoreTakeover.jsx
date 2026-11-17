import React, { useEffect, useState } from 'react';
import Headshot from './Headshot.jsx';
import DownText from './DownText.jsx';

// The scoring play takes over the scorebug: the bug turns into a bar in the scoring team's colors, in the program's own
// style (scoreTakeover.css): TOUCHDOWN or FIELD GOAL, the players who did it (the catcher and the passer, the runner, the
// returner, or the kicker) and the team's score, which rolls up to the new number. When it's done the normal bug fades back.

const nameOf = (p) => { const [first = '', ...rest] = (p?.name || '').split(' '); return `${first ? `${first[0]}. ` : ''}${p?.last || rest.join(' ') || first}`; };

// What each player gets credited with under his name.
function roleOf(score, k) {
  if (score.type === 'fg') return `${score.yards} YDS`;
  if (score.how === 'RECEIVING') return k === 0 ? `${score.yards}-YD CATCH` : 'TD PASS';
  if (score.how === 'RUSHING') return `${score.yards}-YD RUN`;
  return `${score.yards}-YD ${score.how.replace('DEFENSIVE', 'RETURN')}`;
}

// score: from broadcastGfx. team: the scoring team. people: the players in score.ids. bug: the network.
export default function ScoreTakeover({ score, team, people, bug }) {
  const [up, setUp] = useState(false);
  useEffect(() => { const t = setTimeout(() => setUp(true), 1300); return () => clearTimeout(t); }, []);   // the points go up once it's on screen
  const word = score.type === 'fg' ? 'FIELD GOAL' : 'TOUCHDOWN';
  return (
    <div className={`sbt bgx-${bug} sbt-${score.type}`} style={{ '--tc': team.color, '--ta': team.accent }}>
      <i className="sbt-sparks" aria-hidden="true">{Array.from({ length: 12 }, (_, k) => <b key={k} style={{ '--k': k }} />)}</i>
      <img className="sbt-logo" src={team.logo} alt="" />
      <span className="sbt-word">{[...word].map((ch, k) => <span key={k} style={{ animationDelay: `${0.25 + k * 0.045}s` }}>{ch === ' ' ? ' ' : ch}</span>)}</span>
      <span className="sbt-people">
        {people.filter(Boolean).map((p, k) => (
          <span className="sbt-p" key={p.id} style={{ animationDelay: `${0.8 + k * 0.18}s` }}>
            <Headshot player={p} team={team} size={64} />
            <span><b>{nameOf(p)}</b><small>{roleOf(score, k)}</small></span>
          </span>
        ))}
      </span>
      <span className="sbt-score"><small>{team.code}</small><b><DownText text={String(up ? score.to : score.from)} /></b></span>
    </div>
  );
}
