import React from 'react';
import { logoSrc, roman } from '../data/craftBowlPlans.js';
import { getTeam } from '../data/teams.js';

// One Craft Bowl as a tile: its colors as a gradient, the logo (or the numeral until one is uploaded), the host stadium.
// rolling: the dice is spinning, so the stadium line flickers through names (shown = the name on screen right now).
export default function CraftBowlTile({ plan, stadiums, on, rolling, shown, onClick }) {
  const host = getTeam(shown ?? plan.stadium), src = logoSrc(plan.logo);
  return (
    <button type="button" className={`cb-tile${on ? ' on' : ''}${rolling ? ' rolling' : ''}`} onClick={onClick}
      style={{ '--cb1': plan.primary, '--cb2': plan.secondary }}>
      <small className="cb-season">Season {plan.season}</small>
      <div className="cb-art">{src ? <img src={src} alt={`Craft Bowl ${roman(plan.season)}`} /> : <span className="cb-roman"><b>{roman(plan.season)}</b><em>Craft Bowl</em></span>}</div>
      <div className="cb-where">{host ? <><img src={host.logo} alt="" /><span>{stadiums[host.id]?.name || host.name}</span></> : <span>📍 No stadium yet</span>}</div>
    </button>
  );
}
