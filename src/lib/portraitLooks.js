// Decides how a player looks: skin, hair, face shape and features, extras. Seeded by player id, matched to his
// country when he's international. A look saved by the commissioner always wins.
import { seeded } from './seed.js';

export const SKINS = ['#fbe3d3', '#f3cfb3', '#e9b994', '#d8a27a', '#c48a5f', '#a96f49', '#8a5637', '#6c4029', '#4f2e1d'];
const HAIR = {
  black: '#17110e', darkBrown: '#36231a', brown: '#5b3a24', lightBrown: '#8a5d36', auburn: '#7a3b1e',
  dirtyBlonde: '#b38a55', blonde: '#d9b871', red: '#a24a22', platinum: '#e6dcc0',
};
const LIGHT_HAIR = [['blonde', 3], ['dirtyBlonde', 3], ['lightBrown', 4], ['brown', 5], ['darkBrown', 4], ['auburn', 1], ['red', 1], ['black', 1]];
const DARK_HAIR = [['black', 12], ['darkBrown', 3], ['platinum', 1]];
const EYES_LIGHT = [['#5a3a22', 5], ['#7a5a32', 2], ['#4f7fa8', 3], ['#5f8f6a', 2], ['#7d8a90', 1]];
const EYES_DARK = [['#3b2414', 6], ['#5a3a22', 3]];

const STYLES_LIGHT = [['short', 5], ['fade', 4], ['messy', 3], ['buzz', 3], ['side', 3], ['curly', 2], ['crew', 3], ['curtains', 2],
  ['spiky', 2], ['mullet', 2], ['manbun', 1], ['long', 1], ['bald', 1], ['flattop', 1]];
const STYLES_DARK = [['fade', 5], ['buzz', 3], ['hightop', 2], ['afro', 2], ['locs', 3], ['braids', 3], ['twists', 3], ['waves', 3],
  ['short', 1], ['bald', 2], ['mohawk', 1], ['flattop', 2], ['crew', 1]];
const BEARDS = [['none', 9], ['stubble', 5], ['beard', 3], ['goatee', 2], ['mustache', 1], ['chinstrap', 2]];

// League makeup, matched to the NFL (TIDES report card) with a few more white players: about 54% Black, 30% white,
// 9% mixed race, 2% Pacific Islander, 5% Hispanic, plus East Asian when a player's country calls for it.
const GROUPS = {
  black: { w: 54, tones: [[4, 1], [5, 3], [6, 4], [7, 3], [8, 2]], hair: DARK_HAIR, styles: STYLES_DARK, eyes: EYES_DARK },
  white: { w: 30, tones: [[0, 2], [1, 4], [2, 2]], hair: LIGHT_HAIR, styles: STYLES_LIGHT, eyes: EYES_LIGHT },
  mixed: { w: 9, tones: [[3, 1], [4, 2], [5, 2]], hair: [['black', 3], ['darkBrown', 3], ['brown', 1]],
    styles: [['curly', 4], ['fade', 4], ['afro', 2], ['twists', 2], ['short', 2], ['braids', 1], ['buzz', 2]], eyes: EYES_DARK },
  islander: { w: 2, tones: [[4, 1], [5, 1]], hair: [['black', 1]], styles: [['long', 3], ['manbun', 3], ['short', 2], ['locs', 1], ['buzz', 1]], eyes: EYES_DARK },
  hispanic: { w: 5, tones: [[2, 1], [3, 2], [4, 1]], hair: [['black', 3], ['darkBrown', 3], ['brown', 1]], styles: STYLES_LIGHT, eyes: EYES_DARK },
  asian: { w: 0, tones: [[1, 1], [2, 2]], hair: [['black', 1]], styles: [['short', 2], ['curtains', 3], ['spiky', 2], ['fade', 2], ['side', 2]], eyes: [['#2e1d12', 1]] },
};
const COUNTRY_GROUP = {
  Nigeria: 'black', Ghana: 'black', Jamaica: 'black', Haiti: 'black', Samoa: 'islander', Tonga: 'islander',
  Canada: 'white', England: 'white', Australia: 'white', Ireland: 'white', Germany: 'white', Sweden: 'white',
  Poland: 'white', Serbia: 'white', France: 'white', Russia: 'white', Mexico: 'hispanic', Brazil: 'mixed', Japan: 'asian',
};

function weighted(r, list) {
  const total = list.reduce((s, [, w]) => s + w, 0);
  let n = r(total);
  for (const [value, w] of list) {
    if (n < w) return value;
    n -= w;
  }
  return list[0][0];
}

const pickGroup = (r, player) => COUNTRY_GROUP[player.nationality] || weighted(r, Object.entries(GROUPS).map(([k, g]) => [k, g.w]));

export function looksFor(player) {
  const r = seeded('looks-' + player.id);
  const group = GROUPS[pickGroup(r, player)];
  const tone = weighted(r, group.tones);
  const generated = {
    skin: SKINS[tone],
    hair: HAIR[weighted(r, group.hair)],
    style: weighted(r, group.styles),
    beard: weighted(r, BEARDS),
    eyes: weighted(r, group.eyes),
    head: weighted(r, [['oval', 4], ['wide', 3], ['narrow', 2], ['square', 3], ['long', 2]]),
    eyeShape: weighted(r, [['normal', 5], ['wide', 2], ['narrow', 2], ['close', 2]]),
    brows: weighted(r, [['normal', 4], ['thick', 3], ['thin', 2], ['angled', 2]]),
    nose: weighted(r, [['normal', 4], ['small', 2], ['big', 2], ['wide', 2]]),
    mouth: weighted(r, [['neutral', 5], ['smile', 3], ['smirk', 2], ['frown', 1]]),
    chain: r(12) === 0,
    headband: r(13) === 0,
    eyeBlack: r(9) === 0,
    earring: r(12) === 0,
    freckles: tone <= 1 && r(4) === 0,
  };
  return { ...generated, ...(player.looks || {}) };
}

// Which group a generated player falls in. Used for checking the league mix.
export function groupOf(player) {
  return pickGroup(seeded('looks-' + player.id), player);
}
