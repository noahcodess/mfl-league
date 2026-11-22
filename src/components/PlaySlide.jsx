// One replay slide in a break: a label (PLAY OF THE QUARTER, PLAYS OF THE HALF 2 OF 3), the replay itself, and a caption with
// the team that made the play, when it happened and what happened.
import React from 'react';
import ReplayClip from './ReplayClip.jsx';
import { quarterText, clockText } from '../data/gameState.js';

export default function PlaySlide({ label, play, clip, teams, looks }) {
  const side = play.result?.turnover || play.kind === 'sack' ? play.def : play.off, t = teams[side];   // the defense made a pick, a fumble or a sack
  return (
    <div className="pslide">
      <span className="ot-n hf">{label}</span>
      <ReplayClip clip={clip} team={teams.home} looks={looks} />
      <div className="pslide-cap" style={{ '--tc': t.color }}>
        <img src={t.logo} alt="" />
        <span><small>{t.code} · {quarterText(play.before.quarter)} {clockText(Math.max(0, Math.round(play.before.clock)))}</small><b>{play.text}</b></span>
      </div>
    </div>
  );
}
