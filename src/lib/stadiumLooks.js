// Which build each team's stadium is (its roof, poles and supports), the colors it's painted in, and the sky over it.
// Every stadium has the same levels; the build, the team colors and the biome behind it are what change.
import { shade, mix, brightness } from './pixels.js';
import { BIOME } from './stadiumBiomes.js';

export const STADIUM_KINDS = { modern: 'Modern', steel: 'Classic steel', cable: 'Masts and cables', spruce: 'Timber', dome: 'Dome', castle: 'Castle', wave: 'Futuristic curves' };
// One of a kind: the Dragons' castle and the Dolphins' curves. The only two domes: the Rams and the Guardians.
const KIND = { snm: 'modern', void: 'modern', edc: 'modern', wsl: 'modern', pln: 'steel', dst: 'steel', ntw: 'steel', flf: 'steel',
  lsc: 'cable', wrf: 'cable', tga: 'spruce', drf: 'spruce', ddc: 'dome', ocm: 'dome', crf: 'castle', ocn: 'wave' };
const BUILD = { // [supports, concrete]
  modern: ['#e6ebf1', '#454c5a'], steel: ['#3d4654', '#55585f'], castle: ['#b7a78a', '#746b5c'], cable: ['#dde5ee', '#4a505c'], spruce: ['#7d5735', '#4d3622'],
  dome: ['#2c3b46', '#3b424d'], wave: ['#eef3f8', '#48505e'],
};
const OWN = { ocm: ['#4a8d84', '#3f4f50'], drf: ['#4a3423', '#33261b'] }; // prismarine dome, dark oak timber
const readable = (on, ...cs) => [...cs, '#f2f5ee', '#16171a'].find((c) => c && Math.abs(brightness(c) - brightness(on)) > 0.3);

// prime: a night game. Biomes with their own sky (the Nether, the End, the Deep Dark...) look the same day or night.
export function stadiumLook(team, stadium = {}, prime = false) {
  const kind = KIND[team.id] || (stadium.style === 'spruce' ? 'spruce' : 'steel'), [steel, concrete] = OWN[team.id] || BUILD[kind];
  const [scenery, ownSky] = BIOME[team.id] || ['clear'], sky = ownSky || (prime ? 'night' : scenery === 'hot' || scenery === 'dry' ? scenery : 'day');
  const c = team.color, base = brightness(c) < 0.2 ? mix(c, team.accent, 0.3) : c, night = !!ownSky || prime;
  return {
    kind, sky, scenery, night, open: kind !== 'dome' && !ownSky, // open: weather can fall in
    steel, steelHi: shade(steel, 1.35), steelLo: shade(steel, 0.62), concrete, concreteHi: shade(concrete, 1.25), concreteLo: shade(concrete, 0.6),
    seat: shade(base, 0.55), seatLo: shade(base, 0.42), paint: c, paintHi: shade(c, 1.3), paintLo: shade(c, 0.6), trim: readable(c, team.accent),
    glass: night ? '#ffd79a' : '#a9d6ea', led: brightness(team.accent) > 0.45 ? team.accent : shade(c, 1.6), lamp: kind === 'spruce' ? '#ffcf7a' : '#fffbe6',
  };
}
