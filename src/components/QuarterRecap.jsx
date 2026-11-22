// End of the 1st and 3rd quarters: the network's transition, END OF THE 1ST (or 3RD) with the score for a few seconds, another
// transition, then the play of the quarter replayed, and back to the field. Styled by the network like the other breaks.
// plays: the game so far. q: the quarter that just ended. lineups, looks, seed: to act the replay out.
import React, { useMemo } from 'react';
import BreakShow from './BreakShow.jsx';
import PlaySlide from './PlaySlide.jsx';
import { playOfQuarter } from '../lib/playsOfGame.js';
import { clipFor } from '../lib/replayClip.js';

const ORD = { 1: '1st', 3: '3rd' }, NEXT = { 1: '2nd', 3: '4th' };

export default function QuarterRecap({ q, plays, score, teams, bc, lineups, looks, seed, onReveal, onDone }) {
  const best = useMemo(() => playOfQuarter(plays, q), [plays, q]);
  const clip = useMemo(() => best && clipFor(best, lineups, seed), [best, lineups, seed]);
  const title = () => (
    <div className="ht-title qr-title">
      <img className="ht-net" src={bc.prime ? bc.show.logo : bc.net.logo} alt="" />
      <h2 className="hf">End of the {ORD[q]}</h2>
      <div className="ht-score">
        {['away', 'home'].map((k) => <div key={k} className={`ht-team ${k}`} style={{ '--tc': teams[k].color }}><img src={teams[k].logo} alt="" /><b className="hf">{score[k]}</b><span>{teams[k].code}</span></div>)}
      </div>
      <small>{NEXT[q]} quarter up next</small>
    </div>
  );
  const steps = [{ ms: 3800, render: title }, ...(clip ? [{ sting: true }, { ms: clip.ms, render: () => <PlaySlide label="Play of the quarter" play={best} clip={clip} teams={teams} looks={looks} /> }] : [])];
  return <BreakShow net={bc.net} steps={steps} onReveal={onReveal} onDone={onDone} className="qr" />;
}
