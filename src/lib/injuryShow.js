// The broadcast side of injuries: the lineups with each hurt starter's backup in his spots (from the play after he went
// down until he's back, if he comes back), where the camera looks while he's down, and which play shows the injury report
// (4 to 7 plays after he got hurt, picked from the play itself so it's the same every time).
import { yardX, MID_Y, YD, VIEW_H } from './fieldLayout.js';

export const INJ_LEN = 4.4;   // how long the INJURY takeover holds on him (seconds)
export const REPORT_IN = 0.6, REPORT_LEN = 7.5;   // the injury report: when it slides in (seconds into the play) and how long it stays

// lineups: { home, away } from useGameLineups. injuries: game.injuries (simInjury). n: the play's number.
export function lineupsAt(lineups, injuries = [], n = 0) {
  const on = injuries.filter((x) => x.sub && x.n < n && (x.back == null || n < x.back));
  if (!lineups || !on.length) return lineups;
  const out = { ...lineups };
  for (const x of on) {
    const L = out[x.side], sub = L?.all.find((p) => p.id === x.sub);
    if (!sub) continue;
    const swap = (p) => (p?.id === x.id ? sub : p), slots = (list) => list.map((s) => ({ ...s, player: swap(s.player) }));
    const kick = Object.fromEntries(Object.entries(L.kickTeams || {}).map(([k, u]) => [k, { ...u, players: u.players.map(swap), kicker: swap(u.kicker), punter: swap(u.punter), returner: swap(u.returner), holder: swap(u.holder) }]));
    out[x.side] = { ...L, offense: slots(L.offense), defense: slots(L.defense), kickTeams: kick };
  }
  return out;
}

// The close-up while he's down.
export function injuryCam(S, id) {
  const a = S?.by?.[id];
  if (!a) return null;
  const zoom = 2.1;
  return { x: yardX(a.x), y: MID_Y + a.y * YD * 0.92 + (VIEW_H * 0.09) / zoom, zoom };
}

// { playIndex: injury } for the injury report graphic.
export function reportPlays(plays, injuries = []) {
  const out = {};
  injuries.forEach((x) => {
    let k = x.n - 1 + 4 + ((x.n * 7 + 3) % 4);   // 4 to 7 plays later
    while (out[k] && k < plays.length) k++;
    if (k < plays.length) out[k] = x;
  });
  return out;
}
