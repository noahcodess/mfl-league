import React, { useState } from 'react';

// A timeout takes over the scorebug, like a score does: the bug has already grown and the team's timeout light has blinked
// out (PixelGame + scoreTakeover.css); then this bar opens in the team's colors with TIMEOUT dropping in letter by letter,
// the team, how many they have left and where the play clock stopped, and folds back into the bug. pc: play clock right then.
export default function TimeoutTakeover({ team, left, pc, bug, closing }) {
  const [clock] = useState(pc);   // where it stopped, frozen
  return (
    <div className={`sbt bgx-${bug} sbt-to${closing ? ' closing' : ''}`} style={{ '--tc': team.color, '--ta': team.accent }}>
      <img className="sbt-logo" src={team.logo} alt="" />
      <span className="sbt-word">{[...'TIMEOUT'].map((ch, k) => <span key={k} style={{ animationDelay: `${0.25 + k * 0.05}s` }}>{ch}</span>)}</span>
      <span className="sbt-to-who"><b>{team.name}</b><small>{left === 0 ? 'No timeouts left' : `${left} left`}{clock != null ? ` · play clock :${String(clock).padStart(2, '0')}` : ''}</small></span>
    </div>
  );
}
