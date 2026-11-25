import React, { useMemo } from 'react';
import PlayoffBracket from './PlayoffBracket.jsx';
import { useLiveSeason } from '../data/liveSeason.js';
import { records } from '../lib/seasonStats.js';

// The bracket wherever it shows on its own (League tab): only from Week 7 of the real season, counted through every final game.
export const PLAYOFFS_FROM = 7;
export const seasonSettled = (season) => season.weeks.every((w) => w.games.every((g) => g.status === 'final'));

export default function PlayoffPicture() {
  const season = useLiveSeason();
  const rec = useMemo(() => records(season.weeks), [season]);
  if (season.sample || season.current < PLAYOFFS_FROM) return null;
  return <PlayoffBracket rec={rec} settled={seasonSettled(season)} rounds={season.playoffs || []} />;
}
