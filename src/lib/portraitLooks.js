// Decides how a player looks (skin, hair, beard, eyes) from his id. A look saved by the commissioner always wins.
import { seeded } from './seed.js';

export const SKINS = ['#f7d7bf', '#eec19c', '#dca67d', '#c68b60', '#a66d49', '#7f4f34', '#5c3824'];
const SKIN_WEIGHTS = [1, 3, 2, 2, 3, 4, 2];

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

export function looksFor(player) {
  const r = seeded('looks-' + player.id);
  const tone = weighted(r, SKINS.map((s, i) => [i, SKIN_WEIGHTS[i]]));
  const dark = tone >= 4;
  const hairName = weighted(r, HAIR_BY_SKIN[Math.min(3, Math.floor(tone / 2))]);
  const generated = {
    skin: SKINS[tone],
    hair: HAIR[hairName],
    style: weighted(r, dark ? STYLES_DARK : STYLES_LIGHT),
    beard: weighted(r, BEARDS),
    eyes: weighted(r, tone >= 3 ? EYES_DARK : EYES_LIGHT),
    chain: r(10) === 0,
  };
  return { ...generated, ...(player.looks || {}) };
}
