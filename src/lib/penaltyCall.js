// What the referee announces after a flag: the foul, who did it (number and team), the yardage and what happens to the down,
// e.g. "HOLDING" / "#95, SNOWY MOUNTAIN CREEPERS" / "10-YARD PENALTY · REPEAT 2ND DOWN". Also which signal he makes.
const ORD = ['', '1st', '2nd', '3rd', '4th'];
const SPOT = new Set(['Defensive pass interference']);   // a spot foul: the yardage is wherever it happened

// play: the flagged play. people: id -> player. teams: { home, away }.
export function penaltyCall(play, people, teams) {
  const f = (play.events || []).find((e) => e.type === 'flag');
  if (!f) return null;
  const who = people[f.on], team = teams[f.team], onO = f.team === play.off, a = play.after || {};
  const yards = SPOT.has(f.name) ? `${f.yards}-yard spot foul` : `${f.yards}-yard penalty`;
  const down = !onO && (f.auto1st || a.down === 1) ? 'Automatic first down' : a.down ? `Repeat ${ORD[a.down]} down` : '';
  const line2 = f.name === 'Delay of game' ? `Offense, ${team?.name || ''}` : `#${who?.number ?? '?'}, ${team?.name || (onO ? 'Offense' : 'Defense')}`;
  return { name: f.name, lines: [f.name.toUpperCase(), line2.toUpperCase(), `${yards} · ${down}`.toUpperCase()], signal: f.name, first: !onO && down.startsWith('Automatic') };
}
