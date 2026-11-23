// What's on screen during a pre-play cutscene (cutPlan): the stadium shot for a whiteout or Bloodbath opener, the
// two-minute warning card. Shown between the transitions in and out (hold: seconds since the cut).
import React from 'react';
import StadiumCutShot from './StadiumCutShot.jsx';
import TwoMinuteCard from './TwoMinuteCard.jsx';
import { CUT } from '../lib/cutPlan.js';

export default function CutShow({ kind, hold, teams, play, bc, v, crowd, kits }) {
  const K = CUT[kind];
  if (!K || hold < K.shotIn || hold >= K.shotOut || !play) return null;
  if (kind === 'tmw') return <TwoMinuteCard teams={teams} b4={play.before} bc={bc} />;
  return <StadiumCutShot kind={kind} home={teams.home} bc={bc} v={v} fill={crowd?.fill ?? 1} dress={kind === 'wo' ? '#ffffff' : kits?.home?.colors?.jersey || teams.home.color} />;
}
