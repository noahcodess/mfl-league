// Decides how a player looks (skin, hair, beard, eyes) from his id. A look saved by the commissioner always wins.
import { seeded } from './seed.js';

export const SKINS = ['#f7d7bf', '#eec19c', '#dca67d', '#c68b60', '#a66d49', '#7f4f34', '#5c3824'];

const HAIR = {
  black: '#17110e', darkBrown: '#36231a', brown: '#5b3a24', lightBrown: '#8a5d36',
  dirtyBlonde: '#b38a55', blonde: '#d9b871', red: '#9a4826',
};
// Hair color odds by skin tone: lighter skin gets the full range, darker skin mostly black/dark brown.
const HAIR_BY_SKIN = [
  [['blonde', 3], ['dirtyBlonde', 3], ['lightBrown', 3], ['brown', 3], ['red', 1], ['darkBrown', 2]],
  [['dirtyBlonde', 2], ['lightBrown', 3], ['brown', 4], ['darkBrown', 3], ['blonde', 1], ['red', 1], ['black', 1]],
  [['brown', 3], ['darkBrown', 4], ['black', 3], ['lightBrown', 1]],
  [['darkBrown', 3], ['black', 5]],
];
const EYES_LIGHT = [['#5a3a22', 5], ['#7a5a32', 2], ['#4f7fa8', 2], ['#5f8f6a', 1], ['#7d8a90', 1]];
const EYES_DARK = [['#3b2414', 6], ['#5a3a22', 3]];

const STYLES_LIGHT = [['short', 5], ['fade', 4], ['messy', 3], ['buzz', 3], ['side', 3], ['curly', 2], ['long', 1], ['bald', 1]];
const STYLES_DARK = [['fade', 5], ['buzz', 3], ['hightop', 2], ['afro', 2], ['locs', 3], ['braids', 3], ['short', 2], ['bald', 2]];
const BEARDS = [['none', 9], ['stubble', 5], ['beard', 3], ['goatee', 2], ['mustache', 1]];

function weighted(r, list) {
  const total = list.reduce((s, [, w]) => s + w, 0);
  let n = r(total);
  for (const [value, w] of list) {
    if (n < w) return value;
    n -= w;
  }
  return list[0][0];
}

// League makeup, matched to the NFL (TIDES racial report card, 2020-2022): about 57% Black, 26% white,
// 9% mixed race, 2% Pacific Islander, 6% Hispanic or other. Each group gets fitting skin tones, hair and styles.
const GROUPS = [
  { w: 57, tones: [[3, 1], [4, 3], [5, 4], [6, 3]], hair: [['black', 6], ['darkBrown', 1]], styles: STYLES_DARK, eyes: EYES_DARK },
  { w: 26, tones: [[0, 1], [1, 3], [2, 1]], hair: HAIR_BY_SKIN[0].concat(HAIR_BY_SKIN[1]), styles: STYLES_LIGHT, eyes: EYES_LIGHT },
  { w: 9, tones: [[2, 1], [3, 2], [4, 1]], hair: [['black', 3], ['darkBrown', 3], ['brown', 1]],
    styles: [['curly', 4], ['fade', 4], ['afro', 2], ['short', 2], ['braids', 1], ['buzz', 2]], eyes: EYES_DARK },
  { w: 2, tones: [[3, 1], [4, 1]], hair: [['black', 1]], styles: [['long', 3], ['short', 2], ['locs', 1], ['buzz', 1]], eyes: EYES_DARK },
  { w: 6, tones: [[1, 1], [2, 2], [3, 1]], hair: [['black', 3], ['darkBrown', 3], ['brown', 1]], styles: STYLES_LIGHT, eyes: EYES_DARK },
];

export function looksFor(player) {
  const r = seeded('looks-' + player.id);
  const group = GROUPS[weighted(r, GROUPS.map((gr, i) => [i, gr.w]))];
  const tone = weighted(r, group.tones);
  const generated = {
    skin: SKINS[tone],
    hair: HAIR[weighted(r, group.hair)],
    style: weighted(r, group.styles),
    beard: weighted(r, BEARDS),
    eyes: weighted(r, group.eyes),
    chain: r(10) === 0,
  };
  return { ...generated, ...(player.looks || {}) };
}

// Which group a generated player falls in (0 Black, 1 white, 2 mixed, 3 Pacific Islander, 4 Hispanic/other). Used for checking the league mix.
export function groupOf(player) {
  const r = seeded('looks-' + player.id);
  return weighted(r, GROUPS.map((gr, i) => [i, gr.w]));
}
