// Every stadium built so far: name, capacity, biome, building style, roof, and a one-line description.
// Part 1 is 8 stadiums (two done: the Dragons' and Death Valley); the other 8 teams get theirs in part 2.
export const STADIUMS = {
  crf: {
    team: 'crf', name: 'The Crimson Crown', capacity: 92000, biome: 'crimson', style: 'futuristic', roof: 'canopy',
    blurb: 'The biggest house in the MFL. A floating glass canopy and a ring-shaped video board, deep in the Crimson Forest.',
  },
  snm: {
    team: 'snm', name: 'Death Valley', capacity: 85000, biome: 'snowy', style: 'historic', roof: 'open',
    blurb: 'A huge old stone bowl walled in by snowy mountains. Historic bones, modern glass, and the loudest crowd in the Overworld.',
  },
};

export const stadiumFor = (teamId) => STADIUMS[teamId] || null;
export const capacityText = (n) => n.toLocaleString('en-US');
