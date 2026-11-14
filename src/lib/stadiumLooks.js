// Which build each team's stadium is (its roof, poles and supports) and the colors it's painted in. Every stadium has the
// same levels; the build and the team colors are what change.
import { shade, mix, brightness } from './pixels.js';

export const STADIUM_KINDS = { modern: 'Modern', steel: 'Classic steel', arch: 'Stone arches', cable: 'Masts and cables', spruce: 'Spruce timber' };
const KIND = { snm: 'modern', void: 'modern', edc: 'modern', wsl: 'modern', ddc: 'steel', pln: 'steel', dst: 'steel', ntw: 'steel',
  crf: 'arch', drf: 'arch', ocm: 'arch', flf: 'arch', ocn: 'cable', lsc: 'cable', wrf: 'cable', tga: 'spruce' };
const BUILD = { // [supports, concrete]
  modern: ['#e6ebf1', '#454c5a'], steel: ['#3d4654', '#55585f'], arch: ['#b7a78a', '#746b5c'], cable: ['#dde5ee', '#4a505c'], spruce: ['#7d5735', '#4d3622'],
};
const readable = (on, ...cs) => [...cs, '#f2f5ee', '#16171a'].find((c) => c && Math.abs(brightness(c) - brightness(on)) > 0.3);

// sky: 'day', 'night' or 'dome'.
export function stadiumLook(team, stadium = {}, sky = 'day') {
  const kind = stadium.style === 'spruce' ? 'spruce' : KIND[team.id] || 'steel', [steel, concrete] = BUILD[kind];
  const c = team.color, base = brightness(c) < 0.2 ? mix(c, team.accent, 0.3) : c;
  return {
    kind, sky, night: sky !== 'day', steel, steelHi: shade(steel, 1.35), steelLo: shade(steel, 0.62), concrete, concreteHi: shade(concrete, 1.25), concreteLo: shade(concrete, 0.6),
    seat: shade(base, 0.55), seatLo: shade(base, 0.42), paint: c, paintHi: shade(c, 1.3), paintLo: shade(c, 0.6), trim: readable(c, team.accent),
    glass: sky === 'day' ? '#a9d6ea' : '#ffd79a', led: brightness(team.accent) > 0.45 ? team.accent : shade(c, 1.6), lamp: kind === 'spruce' ? '#ffcf7a' : '#fffbe6',
  };
}
