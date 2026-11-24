// The award show's script: every slide in order, how long its animation runs (Next stays locked until it's done), where
// the camera goes, what the big screen says and what the light does. Awards go Game, Coach, Rookie, Offense, Defense,
// and the MVP last. Each award is three slides: the finalists walk on, the award's graphic, then the winner.

export const CAMS = {
  wide: { x: 160, y: 90, z: 1 }, crowd: { x: 160, y: 104, z: 1.05 }, house: { x: 160, y: 98, z: 1.22 }, stage: { x: 160, y: 75, z: 1.28 },
  screen: { x: 160, y: 57, z: 2.45 }, noms: { x: 160, y: 82, z: 1.45 }, win: { x: 160, y: 80, z: 1.62 },
};

const SCREEN_LINES = {
  goty: ['GAME', 'OF THE YEAR'], coy: ['COACH', 'OF THE YEAR'], roy: ['ROOKIE', 'OF THE YEAR'],
  opoy: ['OFFENSIVE PLAYER', 'OF THE YEAR'], dpoy: ['DEFENSIVE PLAYER', 'OF THE YEAR'], mvp: ['MOST VALUABLE', 'PLAYER'],
};
const SHORT = { goty: 'GAME OF THE YEAR', coy: 'COACH OF THE YEAR', roy: 'ROOKIE OF THE YEAR', opoy: 'OFFENSIVE PLAYER', dpoy: 'DEFENSIVE PLAYER', mvp: 'MOST VALUABLE PLAYER' };

// order: award keys in show order. winners: award -> its 3 entries (the winner first). Returns the slides.
export function showSlides(order, winners) {
  const out = [
    { kind: 'lights', len: 7.5, cam: [CAMS.wide, CAMS.wide], screen: 'title', light: 'up' },
    { kind: 'tonight', len: 6, cam: [CAMS.crowd, CAMS.house], screen: 'tonight', clap: 1, light: 'house' },
    { kind: 'list', len: 5, cam: [CAMS.house, CAMS.screen], screen: 'list', light: 'show' },
  ];
  order.forEach((key) => {
    const list = winners[key] || [], game = key === 'goty';
    // The finalists, shuffled onto the marks so the winner isn't always in the same spot.
    const seat = [0, 1, 2].sort((a, b) => ((key.charCodeAt(0) * (a + 3)) % 7) - ((key.charCodeAt(0) * (b + 3)) % 7));
    const onStage = seat.map((k) => list[k]).filter(Boolean), win = onStage.indexOf(list[0]);
    out.push({ kind: 'nominees', key, len: game ? 4.5 : 5.2, cam: [CAMS.screen, game ? CAMS.screen : CAMS.noms], screen: game ? 'games' : 'award', lines: SCREEN_LINES[key], onStage, win, game, light: 'show' });
    out.push({ kind: 'card', key, len: 5, cam: [game ? CAMS.screen : CAMS.noms, CAMS.noms], screen: game ? 'games' : 'award', lines: SCREEN_LINES[key], onStage, win, game, light: 'show' });
    out.push({ kind: 'winner', key, len: game ? 5 : 6.2, cam: [CAMS.noms, game ? CAMS.noms : CAMS.win], screen: game ? 'games' : 'award', lines: SCREEN_LINES[key], onStage, win, game, winner: list[0], light: 'winner', clap: 0.8 });
  });
  out.push({ kind: 'finale', len: 7, cam: [CAMS.stage, CAMS.house], screen: 'winners', light: 'finale', clap: 1 });
  out.push({ kind: 'close', len: 4, cam: [CAMS.house, CAMS.stage], screen: 'winners', light: 'close' });
  return out;
}

export const listNames = (order) => order.map((k) => SHORT[k]);
