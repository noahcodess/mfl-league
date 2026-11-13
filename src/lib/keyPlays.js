// Key plays: the most sensible plays for the moment, best first (up to 8; the first four follow the rules below). 4th down always offers a punt (unless they're inside the other
// team's 30) and a field goal when in range (inside their 38, about a 55-yarder); the rest are ways to go for it, picked by how
// far there is to go. Also a few test moments for the coaching room's "test key play" button.
import { PLAYS } from './playBook.js';

// s: { down, togo, ballOn (yards from your own goal line, 0-100) }
export function keyPlayOptions(s) {
  const toGoal = 100 - s.ballOn, goalToGo = toGoal <= s.togo, picks = [];
  const add = (...keys) => keys.forEach((k) => { if (picks.length < 4 && !picks.includes(k)) picks.push(k); }); // the first four
  if (s.down === 4) {
    if (toGoal <= 38) add('field-goal');
    if (toGoal > 30) add('punt');
    if (s.togo <= 1) add('qb-sneak', 'hb-dive');
    else if (goalToGo) add('fade', 'pa-boot');
    else if (s.togo <= 5) add('slant-flat', 'mesh');
    else add('curl-flat', 'four-verts');
    add('outside-zone', 'mesh', 'pa-boot', 'four-verts');
  } else if (goalToGo && toGoal <= 5) add('qb-sneak', 'hb-dive', 'fade', 'pa-boot');
  else if (s.togo >= 7) add('four-verts', 'mesh', 'curl-flat', 'slant-flat');
  else if (s.togo <= 2) add('hb-dive', 'qb-sneak', 'outside-zone', 'pa-boot');
  else add('slant-flat', 'outside-zone', 'mesh', 'pa-boot');
  // Then up to 8: every other play that still makes sense (no kicks off 4th down, no sneak with more than 3 to go).
  ['slant-flat', 'mesh', 'curl-flat', 'pa-boot', 'outside-zone', 'hb-dive', 'four-verts', 'fade', 'qb-sneak']
    .filter((k) => !(k === 'qb-sneak' && s.togo > 3)).forEach((k) => { if (picks.length < 8 && !picks.includes(k)) picks.push(k); });
  return picks.map((k) => ({ key: k, ...PLAYS[k], group: GROUP[k] || 'Pass', tag: k === 'field-goal' ? `${toGoal + 17}-yard try` : PLAYS[k].tag }));
}
const GROUP = { punt: 'Kick', 'field-goal': 'Kick', 'hb-dive': 'Run', 'outside-zone': 'Run', 'qb-sneak': 'Run' };
export const KEY_PLAY_SLOTS = 8;

export const TEST_MOMENTS = [
  { down: 4, togo: 4, ballOn: 66, quarter: 4, clock: '2:41' },
  { down: 4, togo: 1, ballOn: 45, quarter: 3, clock: '8:10' },
  { down: 3, togo: 9, ballOn: 58, quarter: 2, clock: '0:38' },
  { down: 3, togo: 3, ballOn: 97, quarter: 4, clock: '0:12' },
  { down: 4, togo: 8, ballOn: 30, quarter: 1, clock: '6:55' },
];

const ORD = ['1st', '2nd', '3rd', '4th'];
export function momentText(s) {
  const toGoal = 100 - s.ballOn, spot = s.ballOn === 50 ? '50' : s.ballOn < 50 ? `Own ${s.ballOn}` : `Opp ${toGoal}`;
  return `${ORD[s.down - 1]} & ${toGoal <= s.togo ? 'Goal' : s.togo} · ${spot}${s.clock ? ` · ${ORD[(s.quarter || 1) - 1]} ${s.clock}` : ''}`;
}
