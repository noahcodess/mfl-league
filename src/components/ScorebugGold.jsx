import React from 'react';
import { roman } from '../data/craftBowlPlans.js';
import { currentSeason } from '../data/teams.js';

// The Craft Bowl's trim on any scorebug: a gold light sweeping across it every few seconds, two gold gems at its ends and
// a small gold "Craft Bowl" tab on top. The bug itself stays the network's (scorebugGold.css adds the gold edges).
// part="shine" goes inside the bar (clipped with it); part="trim" sits on top of the bar, outside any clip-path (ESPN's slanted bar).
export default function ScorebugGold({ part }) {
  const shine = <i className="sbg-shine" aria-hidden="true" />;
  const trim = (
    <>
      <i className="sbg-gem l" aria-hidden="true" /><i className="sbg-gem r" aria-hidden="true" />
      <span className="sbg-tab">🏆 Craft Bowl {roman(currentSeason())}</span>
    </>
  );
  if (part === 'shine') return shine;
  if (part === 'trim') return <div className="sbg-frame">{trim}</div>;
  return <>{shine}{trim}</>;
}
