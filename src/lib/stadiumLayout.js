// The stadium shot's measurements: the picture size, how far each layer slides while the camera rises (near things slide
// more, which is what makes it feel 3D), where each level sits, and every seat in both decks.
export const W = 480, H = 270;
// The two seating decks slide together so no row ever pops out from behind the level below it.
export const TRAVEL = { far: 46, upper: 200, lower: 200, front: 330 };
// Lower layer, top to bottom: the rail, the video ribbon between levels, suites, the concourse wall with tunnels, the lower bowl.
export const L = { rail: 190, ribbon: 196, ribbonH: 20, suites: 220, suitesH: 36, wall: 256, wallH: 36, rows: 292, rowH: 14, pitch: 11, n: 14, aisle: 12 };
// Upper layer: sky room for the roof, the roof, the back wall, then the upper deck (set back, so smaller fans).
export const U = { roof: 46, wall: 62, wallH: 26, rows: 88, rowH: 8, pitch: 7, n: 16, aisle: 7 };
export const AISLES = { lower: [54, 174, 294, 414], upper: [0, 119, 238, 357, 473] };

export const layer = (travel) => { const c = document.createElement('canvas'); c.width = W; c.height = H + travel; return c; };
export const inAisle = (x, w, deck) => AISLES[deck].some((a) => x + w > a && x < a + (deck === 'lower' ? L.aisle : U.aisle));

// Every seat in a deck, back row first (so nearer rows paint over farther ones). Rows are staggered like real seats;
// grid lines the upper deck up instead so a card stunt reads.
export function seatSpots(deck, grid = false) {
  const d = deck === 'lower' ? L : U, big = deck === 'lower', w = big ? 9 : 5, out = [];
  for (let row = 0; row < d.n; row++) {
    for (let x = 1 + (grid ? 0 : (row % 2) * (big ? 5 : 3)); x + w <= W; x += d.pitch) {
      if (!inAisle(x, w, deck)) out.push({ x, y: d.rows + row * d.rowH, row, col: Math.floor(x / d.pitch), big });
    }
  }
  return out;
}
