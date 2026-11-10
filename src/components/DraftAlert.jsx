import React, { useEffect, useState } from 'react';
import { useMyDraftTurn } from '../data/draftTurn.js';
import { currentSeason } from '../data/teams.js';
import { links } from '../lib/router.js';
import { clockText } from '../lib/draftClock.js';

// A banner on every page during the draft: "You're on the clock" (with the time left) or "You pick in 2". Taps through to the draft room.
export default function DraftAlert({ teamId, page }) {
  const turn = useMyDraftTurn(teamId, currentSeason());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!turn?.onClock) return undefined;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [turn?.onClock]);
  useEffect(() => {
    if (!turn?.onClock) return undefined;
    const old = document.title; let flip = false;
    const t = setInterval(() => { flip = !flip; document.title = flip ? '⏰ YOUR PICK!' : old; }, 1000);
    return () => { clearInterval(t); document.title = old; };
  }, [turn?.onClock]);
  if (!turn || page === 'draft' || turn.picksAway > 3 || (turn.picksAway === 0 && !turn.onClock)) return null;
  if (turn.onClock) {
    const left = turn.endsAt ? Math.max(0, Math.ceil((Date.parse(turn.endsAt) - now) / 1000)) : 0;
    return <a className="draft-alert hot" href={links.draft}>⏰ <b>You're on the clock!</b> Pick #{turn.pickNo} · {clockText(left)} left <span>Make your pick →</span></a>;
  }
  return <a className="draft-alert" href={links.draft}>🏈 Season {currentSeason()} Draft: you pick in {turn.picksAway} {turn.picksAway === 1 ? 'pick' : 'picks'} (#{turn.pickNo}) <span>Go to the draft room →</span></a>;
}
