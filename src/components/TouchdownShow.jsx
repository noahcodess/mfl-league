import React, { useMemo } from 'react';
import Headshot from './Headshot.jsx';

// The touchdown show, half a second after the scorer has the ball in the end zone: TOUCHDOWN slams in with fireworks in the
// team's colors, then the team, then the scorer with "38-YARD TOUCHDOWN". Then the program's transition takes it to the
// replay. Styled per network (bgx-<bug> in broadcastGraphics.css, the show itself in touchdownShow.css). About 3.6 seconds.
const BURSTS = [[22, 30, 0], [78, 26, 0.25], [50, 18, 0.5], [30, 62, 0.9], [70, 60, 1.15], [50, 40, 1.6], [18, 45, 2.1], [82, 45, 2.4]];

function Fireworks({ team }) {
  const sparks = useMemo(() => BURSTS.flatMap(([x, y, d], b) => Array.from({ length: 14 }, (_, k) => {
    const ang = (k / 14) * Math.PI * 2 + b, r = 7 + (k % 3) * 2.2;
    return { key: `${b}-${k}`, style: { left: `${x}%`, top: `${y}%`, '--dx': `${Math.cos(ang) * r}cqw`, '--dy': `${Math.sin(ang) * r}cqw`, '--c': [team.color, team.accent, '#fff'][k % 3], animationDelay: `${d}s` } };
  })), [team.color, team.accent]);
  return <div className="td-fw">{sparks.map((s) => <i key={s.key} style={s.style} />)}</div>;
}

// td: { how, yards }. team: the scoring team. player: the scorer (or null). bug: the network.
export default function TouchdownShow({ bug, td, team, player }) {
  const last = player ? (player.last || player.name.split(' ').slice(1).join(' ') || player.name) : '';
  return (
    <div className={`td-show bgx-${bug}`} style={{ '--tc': team.color, '--ta': team.accent }}>
      <Fireworks team={team} />
      <div className="td-word">{[...'TOUCHDOWN'].map((ch, k) => <span key={k} style={{ animationDelay: `${0.05 * k}s` }}>{ch}</span>)}</div>
      <div className="td-team"><img src={team.logo} alt="" /><b>{team.name}</b></div>
      {player && (
        <div className="td-player">
          <span className="td-face"><Headshot player={player} team={team} size={64} /></span>
          <span className="td-who"><small>#{player.number ?? ''} {player.name.split(' ')[0]}</small><b>{last}</b><em>{td.yards}-YARD {td.how === 'RECEIVING' || td.how === 'RUSHING' ? '' : `${td.how} `}TOUCHDOWN</em></span>
        </div>
      )}
    </div>
  );
}
