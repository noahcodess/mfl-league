import React from 'react';

// The graphics that rise out of the top of the scorebug, drawn in the program's own style (FOX, CBS, ESPN, TNF, SNF):
//  - the field goal bar: rises out of the scorebug before a field goal with the distance (from where it's held to the posts)
//  - the "ball on" tag: rises out of the scorebug the same way before a snap, with the yard line and which way they're going.
//  - the drive summary: after a touchdown, the drive that got it (plays, yards, time).
// All slide up out of the scorebug, hold for a few seconds and sink back into it (out = sinking). broadcastGfx decides when.

// "SNM 35", "DDC 20" or "50": the yard line from the offense's point of view, named by whose side of the field it is.
export function yardLineText(ballOn, offense, defense) {
  if (ballOn === 50) return '50';
  return ballOn < 50 ? `${offense.code} ${ballOn}` : `${defense.code} ${100 - ballOn}`;
}

export function FieldGoalBar({ bug, dist, kicker, out }) {
  return (
    <div className={`bg-fg bgx-${bug}${out ? ' out' : ''}`}>
      <b>{dist}-YARD FIELD GOAL</b>
      {kicker && <span>{kicker}</span>}
    </div>
  );
}

// dir: 1 when the offense is moving right on screen, -1 left.
export function BallOnTag({ bug, text, team, dir, out }) {
  return (
    <div className={`bg-ballon bgx-${bug}${out ? ' out' : ''}`} style={{ '--tc': team.color }}>
      {dir < 0 && <i className="bg-arrow left" />}
      <img src={team.logo} alt="" />
      <span><small>BALL ON</small><b>{text}</b></span>
      {dir > 0 && <i className="bg-arrow right" />}
    </div>
  );
}


export function DriveSummary({ bug, team, plays, yards, time, out }) {
  return (
    <div className={`bg-fg bg-drive bgx-${bug}${out ? ' out' : ''}`} style={{ '--tc': team.color }}>
      <b><img src={team.logo} alt="" />TOUCHDOWN DRIVE</b>
      <span>{plays} {plays === 1 ? 'PLAY' : 'PLAYS'}</span><span>{yards} YDS</span><span>{time}</span>
    </div>
  );
}
