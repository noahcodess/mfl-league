// A player is down: the scorebug turns into an INJURY bar in his team's colors, in the program's own style (the scoring
// takeover's look, scoreTakeover.css), with the red medical cross, the word dropping in and the hurt player's headshot,
// number and name. It holds while the camera stays on him, then the transition takes it away.
import React from 'react';
import Headshot from './Headshot.jsx';
import MedicalCross from './MedicalCross.jsx';

const nameOf = (p) => { const [first = '', ...rest] = (p?.name || '').split(' '); return `${first ? `${first[0]}. ` : ''}${p?.last || rest.join(' ') || first}`; };

// player: the hurt man (sim player). team: his team. bug: the network.
export default function InjuryTakeover({ player, team, bug }) {
  return (
    <div className={`sbt bgx-${bug} sbt-inj`} style={{ '--tc': team.color, '--ta': team.accent }}>
      <MedicalCross className="sbt-cross" />
      <span className="sbt-word">{[...'INJURY'].map((ch, k) => <span key={k} style={{ animationDelay: `${0.3 + k * 0.05}s` }}>{ch}</span>)}</span>
      {player && (
        <span className="sbt-people">
          <span className="sbt-p" style={{ animationDelay: '0.75s' }}>
            <Headshot player={player} team={team} size={64} />
            <span><b>{nameOf(player)}</b><small>#{player.number ?? '-'} · {player.pos} · {team.code}</small></span>
          </span>
        </span>
      )}
      <img className="sbt-logo" src={team.logo} alt="" />
    </div>
  );
}
