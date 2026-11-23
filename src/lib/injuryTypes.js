// Every injury a player can pick up, how often it happens and how long it keeps him out. Times are real recovery times
// cut by a quarter (a 4-week hamstring is 3 weeks here), so most injuries cost 1 to 3 weeks and anything past 5 is rare.
// About a fifth of injuries are the kind a player can come back from in the same game (cramps, a stinger, a bruise).
// part: where it hurts (the field animation he holds). contact: true = only on a hit, false = only without one, null = either.
// [key, name, part, contact, weight, minWeeks, maxWeeks]; maxWeeks 99 = out for the season.
export const INJURIES = [
  ['cramp', 'Leg cramps', 'calf', false, 8, 0, 0],
  ['stinger', 'Stinger', 'shoulder', true, 4, 0, 0],
  ['bruise', 'Thigh bruise', 'thigh', true, 7, 0, 0],
  ['back', 'Back spasms', 'back', false, 3, 0, 1],
  ['hip', 'Hip pointer', 'hip', true, 3, 0, 1],
  ['hamstring', 'Hamstring strain', 'hamstring', false, 14, 1, 3],
  ['hamstring2', 'Pulled hamstring (Grade 2)', 'hamstring', false, 5, 3, 4],
  ['ankle', 'Ankle sprain', 'ankle', true, 11, 1, 2],
  ['highankle', 'High ankle sprain', 'ankle', true, 5, 3, 5],
  ['mcl', 'Knee sprain (MCL)', 'knee', true, 6, 1, 2],
  ['mcl2', 'MCL sprain (Grade 2)', 'knee', true, 3, 3, 5],
  ['groin', 'Groin strain', 'thigh', false, 6, 1, 3],
  ['calf', 'Calf strain', 'calf', false, 4, 1, 2],
  ['quad', 'Quad strain', 'thigh', false, 3, 1, 2],
  ['concussion', 'Concussion', 'head', true, 5, 1, 2],
  ['shoulder', 'Shoulder sprain (AC joint)', 'shoulder', true, 5, 1, 3],
  ['ribs', 'Rib contusion', 'ribs', true, 3, 1, 2],
  ['turftoe', 'Turf toe', 'ankle', null, 3, 2, 4],
  ['hand', 'Broken hand', 'arm', true, 2, 3, 4],
  ['dislocate', 'Dislocated shoulder', 'shoulder', true, 1.2, 4, 6],
  ['collarbone', 'Broken collarbone', 'shoulder', true, 0.6, 6, 7],
  ['acl', 'Torn ACL', 'knee', null, 0.35, 99, 99],
  ['achilles', 'Torn Achilles', 'ankle', false, 0.15, 99, 99],
].map(([key, name, part, contact, weight, min, max]) => ({ key, name, part, contact, weight, min, max }));

export const SEASON = 99;
export const byKey = Object.fromEntries(INJURIES.map((x) => [x.key, x]));

// How bad it is, from how long he's out.
export const severity = (weeks) => (weeks >= SEASON ? 'Season-ending' : weeks >= 5 ? 'Serious' : weeks >= 3 ? 'Moderate' : weeks >= 1 ? 'Mild' : 'Minor');

// Picks one. contact: was he hit. r: a 0-1 roll.
export function pickInjury(contact, r) {
  const pool = INJURIES.filter((x) => x.contact == null || x.contact === contact), total = pool.reduce((n, x) => n + x.weight, 0);
  let k = r * total;
  return pool.find((x) => (k -= x.weight) < 0) || pool[pool.length - 1];
}
