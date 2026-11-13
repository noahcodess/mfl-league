// The plays a coach can pick on a key play, drawn like Madden play art on a 100 x 64 field (offense at the bottom, moving up,
// line of scrimmage at y 40). Each play: name, short tag, formation (player spots) and paths. A path's color says its job:
// gold = the main read or ball carrier, red = everyone else's route, dashed gold = where the ball goes on kicks.
const OL = [[38, 42], [44, 42], [50, 42], [56, 42], [62, 42]];
const GUN = { qb: [50, 52], rb: [57, 52] }, UNDER = { qb: [50, 45.5], rb: [50, 54] };
const X = [8, 42], Z = [92, 42], SLOT = [22, 43.5], TE = [68, 42.5];
const block = (p) => ({ pts: [p, [p[0], p[1] - 3]], kind: 'block' });
const blocks = OL.map(block);

export const PLAYS = {
  'slant-flat': { name: 'Slant Flat', tag: 'Short pass', spots: [...OL, GUN.qb, GUN.rb, X, Z, SLOT, TE],
    paths: [{ pts: [X, [8, 36], [22, 27]], main: true }, { pts: [SLOT, [22, 40], [9, 37]] }, { pts: [Z, [92, 8]] }, { pts: [TE, [70, 30], [80, 22]] }, { pts: [GUN.rb, [66, 47], [74, 40]] }] },
  'four-verts': { name: 'Four Verticals', tag: 'Deep pass', spots: [...OL, GUN.qb, GUN.rb, X, Z, SLOT, TE],
    paths: [{ pts: [X, [8, 6]] }, { pts: [SLOT, [26, 30], [28, 6]], main: true }, { pts: [TE, [70, 30], [72, 6]] }, { pts: [Z, [92, 6]] }, { pts: [GUN.rb, [44, 47], [40, 40]] }] },
  mesh: { name: 'Mesh', tag: 'Crossing routes', spots: [...OL, GUN.qb, GUN.rb, X, Z, SLOT, TE],
    paths: [{ pts: [SLOT, [26, 35], [70, 34]], main: true }, { pts: [TE, [66, 37], [28, 36]] }, { pts: [X, [8, 24], [30, 22]] }, { pts: [Z, [92, 22], [82, 10]] }, { pts: [GUN.rb, [64, 47], [70, 41]] }] },
  'curl-flat': { name: 'Curl Flat', tag: 'Medium pass', spots: [...OL, GUN.qb, GUN.rb, X, Z, SLOT, TE],
    paths: [{ pts: [X, [8, 26], [11, 29]], main: true }, { pts: [SLOT, [20, 40], [6, 38]] }, { pts: [Z, [92, 26], [89, 29]] }, { pts: [TE, [70, 38], [88, 37]] }, { pts: [GUN.rb, [48, 46], [50, 34]] }] },
  'pa-boot': { name: 'PA Boot', tag: 'Play action', spots: [...OL, UNDER.qb, UNDER.rb, X, Z, TE],
    paths: [{ pts: [UNDER.qb, [56, 50], [70, 50]], kind: 'qb' }, { pts: [UNDER.rb, [44, 46]], kind: 'fake' }, { pts: [TE, [66, 37], [36, 30]], main: true },
      { pts: [Z, [92, 20], [84, 26]] }, { pts: [X, [8, 18], [40, 12]] }] },
  'hb-dive': { name: 'HB Dive', tag: 'Run inside', spots: [...OL, UNDER.qb, UNDER.rb, X, Z, TE],
    paths: [{ pts: [UNDER.rb, [52, 44], [52, 26]], main: true, kind: 'run' }, ...blocks, block(TE)] },
  'outside-zone': { name: 'Outside Zone', tag: 'Run outside', spots: [...OL, UNDER.qb, UNDER.rb, X, Z, TE],
    paths: [{ pts: [UNDER.rb, [60, 50], [74, 44], [78, 28]], main: true, kind: 'run' }, ...OL.map((p) => ({ pts: [p, [p[0] + 4, p[1] - 3]], kind: 'block' })), { pts: [TE, [74, 38]], kind: 'block' }] },
  'qb-sneak': { name: 'QB Sneak', tag: 'Push the pile', spots: [...OL, UNDER.qb, UNDER.rb, TE, [32, 42.5]],
    paths: [{ pts: [UNDER.qb, [50, 33]], main: true, kind: 'run' }, ...blocks] },
  fade: { name: 'Fade', tag: 'Goal line pass', spots: [...OL, GUN.qb, GUN.rb, X, Z, TE],
    paths: [{ pts: [X, [8, 22], [13, 6]], main: true }, { pts: [Z, [92, 36], [78, 28]] }, { pts: [TE, [70, 38], [86, 36]] }, { pts: [GUN.rb, [44, 46]], kind: 'block' }] },
  punt: { name: 'Punt', tag: 'Flip the field', spots: [[50, 58], [50, 42], [44, 42], [38, 42], [56, 42], [62, 42], [6, 42], [94, 42], [46, 50], [54, 50], [50, 51]],
    paths: [{ pts: [[50, 58], [50, 4]], kind: 'kick' }, { pts: [[6, 42], [10, 10]] }, { pts: [[94, 42], [90, 10]] }, ...[[44, 42], [56, 42]].map((p) => ({ pts: [p, [p[0], 22]] }))] },
  'field-goal': { name: 'Field Goal', tag: 'Take the points', spots: [...OL, [32, 42.5], [68, 42.5], [28, 44], [72, 44], [50, 49], [46, 55]],
    paths: [{ pts: [[46, 55], [50, 6]], kind: 'kick' }, ...blocks], posts: true },
};
