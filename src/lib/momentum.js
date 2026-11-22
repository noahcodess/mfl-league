// Momentum: a hidden tug of war between the teams, -1 (visitors rolling) to +1 (home rolling), never shown on screen. Built
// the way sports games do it (Madden's momentum meter, College Football's crowd that rises with the home team and goes
// quiet when the visitors make a play): big moments swing it (scores, turnovers, sacks, stops, 4th-down conversions, the
// crowd rattling the visitors), it drifts back between plays, and the home team starts with a small edge that a loud
// house keeps topping up. It nudges every player's ratings a little (simCore.val, about ±1.5) and mostly drives the crowd
// (stadiumPulse): a rolling home team makes it louder, a visiting surge quiets it.
import { clamp } from './simCore.js';   // swing() itself lives in simCore (the home team's swings land harder in a loud house)

// Where it settles when nothing is happening: a small home edge, bigger with a big loud crowd.
export const momentumBase = (G) => 0.02 + 0.04 * (G.crowdE || 0);
export const momentumStart = (G) => 0.06 + 0.04 * (G.crowdE || 0);

// After every play: drift back toward the base.
export function settle(G) { const b = momentumBase(G); G.mom = clamp(b + (G.mom - b) * 0.97, -1, 1); }

