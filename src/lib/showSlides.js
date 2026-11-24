// The award show's script: every slide in order, how long its animation runs (Next stays locked until it's done), its
// camera keyframes (each slide starts from wherever the camera already is, so nothing jumps) and what the screen shows.
// It opens on the stage and pulls back into the auditorium. Each award: its title card on the screen, the finalists
// (they walk on, the screen stacks them), then the reveal: the lights drop, the drum roll, spotlights hunting, the
// winner on the screen, confetti. Game, Coach, Rookie, Offense, Defense, and the MVP last.
export const CAMS = {
  live: { x: 160, y: 75, z: 1.28 }, wide: { x: 160, y: 92, z: 1 }, crowd: { x: 160, y: 104, z: 1.05 }, house: { x: 160, y: 98, z: 1.22 },
  screen: { x: 160, y: 62, z: 2.08 }, stage: { x: 160, y: 80, z: 1.62 }, push: { x: 160, y: 82, z: 1.85 }, out: { x: 160, y: 83, z: 1.5 },
  games: { x: 160, y: 64, z: 1.9 },
};
export const DRUM_AT = 0.6, HIT = 5.0;   // the drum roll starts, and its final hit (the trimmed file hits 4.4s in)

const LINES = { goty: ['Game', 'of the Year'], coy: ['Coach', 'of the Year'], roy: ['Rookie', 'of the Year'], opoy: ['Offensive Player', 'of the Year'], dpoy: ['Defensive Player', 'of the Year'], mvp: ['Most Valuable', 'Player'] };
export const AWARD_NAME = { goty: 'GAME OF THE YEAR', coy: 'COACH OF THE YEAR', roy: 'ROOKIE OF THE YEAR', opoy: 'OFFENSIVE PLAYER OF THE YEAR', dpoy: 'DEFENSIVE PLAYER OF THE YEAR', mvp: 'MOST VALUABLE PLAYER' };

// order: award keys in show order. winners: award -> its 3 entries (the winner first). Returns the slides.
export function showSlides(order, winners) {
  const out = [
    { kind: 'opening', len: 9, keys: [[0, CAMS.live], [1.2, CAMS.live], [8.6, CAMS.wide]], screen: 'title' },
    { kind: 'tonight', len: 6, keys: [[0, CAMS.crowd], [1.6, CAMS.crowd], [6, CAMS.house]], screen: 'tonight', clap: 1 },
    { kind: 'list', len: 5.5, keys: [[0, CAMS.house], [2.4, CAMS.screen]], screen: 'list' },
  ];
  order.forEach((key, n) => {
    const list = winners[key] || [], game = key === 'goty';
    const seat = [0, 1, 2].sort((a, b) => ((key.charCodeAt(0) * (a + 3)) % 7) - ((key.charCodeAt(0) * (b + 3)) % 7));   // the winner isn't always in the same spot
    const onStage = seat.map((k) => list[k]).filter(Boolean), win = onStage.indexOf(list[0]);
    const lead = n === 0 ? 'FIRST UP' : n === order.length - 1 ? 'AND FINALLY' : 'NEXT';
    const base = { key, game, onStage, win, winner: list[0], title: AWARD_NAME[key], lines: LINES[key] };
    out.push({ ...base, kind: 'intro', len: 3.6, keys: [[0, CAMS.screen], [1.6, CAMS.screen]], screen: 'intro', lead });
    out.push({ ...base, kind: 'finalists', len: game ? 4.6 : 6.4, keys: [[0, CAMS.screen], [1.4, CAMS.screen], [3.2, game ? CAMS.games : CAMS.stage]], screen: 'finalists' });
    out.push({ ...base, kind: 'reveal', len: 9, keys: game ? [[0, CAMS.games], [HIT, CAMS.screen], [HIT + 1.6, CAMS.games]] : [[0, CAMS.stage], [HIT, CAMS.push], [HIT + 1.4, CAMS.out]], screen: 'reveal', clap: 1 });
  });
  out.push({ kind: 'finale', len: 7.5, keys: [[0, CAMS.out], [3, CAMS.house]], screen: 'winners', clap: 1 });
  out.push({ kind: 'close', len: 4.5, keys: [[0, CAMS.house], [3.6, CAMS.live]], screen: 'after' });
  return out;
}

export const SHORT = { goty: 'Game of the Year', coy: 'Coach of the Year', roy: 'Rookie of the Year', opoy: 'Offensive Player', dpoy: 'Defensive Player', mvp: 'Most Valuable Player' };
export const listNames = (order) => order.map((k) => SHORT[k].toUpperCase());

// The camera at time t: from `start` (where it was when the slide began) through the slide's keyframes, eased.
export function camAt(sl, t, start, ease) {
  const keys = sl.keys.map((k, i) => (i === 0 ? [0, start || k[1]] : k));
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = ease((t - t0) / Math.max(0.001, t1 - t0));
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
    }
  }
  return keys[keys.length - 1][1];
}
