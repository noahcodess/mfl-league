import React from 'react';
import AttributeBars from './AttributeBars.jsx';
import { usePlayerAttributes } from '../data/attributes.js';
import { strengthsAndWeaknesses } from '../lib/strengths.js';
import { STYLES } from '../lib/attributeDefs.js';

// The skills part of a player page: his position rank and league rank (from his skills), his archetype with strengths and
// weaknesses, then his attribute bars.
export default function PlayerSkills({ player, potential }) {
  const { ratings, ceilings, style, rank, loaded } = usePlayerAttributes(player, potential);
  if (!loaded) return <p className="dim">Loading skills...</p>;
  if (!ratings) return null;
  const { strengths, weaknesses } = strengthsAndWeaknesses(player.position, ratings);
  return (
    <>
      {rank && (
        <div className="ranks">
          <div><span>{player.position} rank</span><b>#{rank.pos_rank}</b></div>
          <div><span>League rank</span><b>#{rank.overall_rank}</b></div>
        </div>
      )}
      <section className="archetype">
        <h3>Archetype</h3>
        <div className="arch-name">{STYLES[player.position]?.[style] || 'All-around'}</div>
        <div className="arch-cols">
          <div><span className="good">Strengths</span>{strengths.length ? <ul>{strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="dim">Nothing stands out yet.</p>}</div>
          <div><span className="bad">Weaknesses</span>{weaknesses.length ? <ul>{weaknesses.map((w) => <li key={w}>{w}</li>)}</ul> : <p className="dim">No real holes in his game.</p>}</div>
        </div>
      </section>
      <AttributeBars position={player.position} ratings={ratings} ceilings={ceilings} />
    </>
  );
}
