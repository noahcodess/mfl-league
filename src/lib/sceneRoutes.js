// The route tree: what each receiver runs on the broadcast, drawn from the play that was called (Four Verticals is four
// go routes, Smash is a corner over a hitch, Mesh is two crossers...). A route bends to the depth the engine gave it: a go
// route caught at 8 yards becomes a hitch, a hitch caught at 20 becomes a go. Points are [yards downfield, yards from the
// middle]; out = toward his own sideline. The last point is where he wants the ball.
const SHAPES = {
  go: (l, d, o) => [[d, l + o * 1.2]],
  fade: (l, d, o) => [[d * 0.5, l + o * 2], [d, l + o * 4]],
  seam: (l, d, o) => [[d, l - o * 1]],
  post: (l, d, o) => [[Math.max(6, d * 0.55), l], [d, l - o * 7]],
  corner: (l, d, o) => [[Math.max(6, d * 0.55), l], [d, l + o * 7]],
  comeback: (l, d, o) => [[d + 3, l + o * 0.5], [d, l + o * 3]],
  out: (l, d, o) => [[d, l], [d, l + o * 5]],
  dig: (l, d, o) => [[d, l], [d, l - o * 8]],
  slant: (l, d, o) => [[1.5, l], [d, l - o * 5]],
  hitch: (l, d, o) => [[d + 1.5, l], [d, l - o * 0.8]],
  stick: (l, d, o) => [[d, l], [d, l + o * 1.5]],
  spot: (l, d, o) => [[d, l - o * 2.5]],
  flat: (l, d, o) => [[1.5, l + o * 2], [Math.max(d, 1), l + o * 6]],
  wheel: (l, d, o) => [[2, l + o * 4], [Math.max(6, d * 0.4), l + o * 7], [d, l + o * 6.5]],
  drag: (l, d, o) => [[2, l], [Math.max(d, 3), l - o * 12]],
  cross: (l, d, o) => [[d * 0.6, l], [d, l - o * 13]],
  screen: (l, d, o) => [[-1, l + o * 0.5], [Math.max(d, 0), l + o * 1.5]],
  double: (l, d, o) => [[7, l], [8, l + o * 2], [d, l - o * 0.5]],   // a stop-and-go
};
const DEEP = new Set(['go', 'fade', 'seam', 'post', 'corner', 'wheel', 'double']);
const SHORTER = { go: 'hitch', fade: 'hitch', seam: 'stick', post: 'slant', corner: 'out', wheel: 'flat', double: 'hitch', comeback: 'out', cross: 'drag', dig: 'slant' };
const LONGER = { hitch: 'go', stick: 'seam', slant: 'post', out: 'corner', flat: 'wheel', drag: 'cross', spot: 'seam', screen: 'go', dig: 'post' };

// What each slot runs in each concept. Anything not listed gets a sensible route for its depth.
const CONCEPTS = {
  'Slant-Flat': { WR1: 'slant', RB: 'flat', TE: 'stick', WR2: 'slant' }, Stick: { TE: 'stick', WR2: 'flat', WR1: 'go', RB: 'flat' },
  'Stick-Nod': { TE: 'double', WR1: 'hitch', WR2: 'flat' }, Hitch: { WR1: 'hitch', WR2: 'hitch', TE: 'seam', RB: 'flat' },
  'Quick Out': { WR1: 'out', WR2: 'out', TE: 'stick' }, Spot: { TE: 'spot', WR2: 'flat', WR1: 'corner' }, Fade: { WR1: 'fade', WR2: 'fade', TE: 'stick' },
  'Bubble Screen': { WR2: 'screen', WR1: 'go', TE: 'stick' }, 'Tunnel Screen': { WR1: 'screen', WR2: 'go', TE: 'drag' }, 'Jailbreak Screen': { WR1: 'screen', WR2: 'go' },
  'RB Screen': { RB: 'screen', WR1: 'go', WR2: 'go', TE: 'drag' }, 'Slant RPO': { WR1: 'slant', WR2: 'slant', TE: 'stick' }, 'Glance RPO': { WR2: 'post', WR1: 'hitch' },
  Mesh: { TE: 'drag', WR2: 'drag', WR1: 'corner', RB: 'flat' }, 'Shallow Cross': { WR2: 'drag', TE: 'dig', WR1: 'go' }, Spacing: { WR2: 'hitch', TE: 'spot', WR1: 'hitch', RB: 'flat' },
  'Curl-Flat': { WR1: 'hitch', RB: 'flat', TE: 'seam', WR2: 'hitch' }, Hank: { WR1: 'hitch', WR2: 'hitch', TE: 'hitch' }, Drive: { TE: 'dig', WR1: 'drag', RB: 'flat' },
  Snag: { WR2: 'spot', TE: 'corner', RB: 'flat' }, Texas: { RB: 'slant', TE: 'seam', WR1: 'go' }, Dagger: { WR2: 'seam', WR1: 'dig', TE: 'drag' },
  Levels: { WR1: 'dig', TE: 'drag', WR2: 'go' }, 'Hi-Lo': { TE: 'drag', WR1: 'dig', RB: 'flat' }, Flood: { TE: 'out', WR1: 'go', RB: 'flat', WR2: 'corner' },
  Smash: { WR2: 'corner', WR1: 'hitch', TE: 'seam' }, 'Y-Cross': { TE: 'cross', WR1: 'go', WR2: 'post' }, Dig: { WR1: 'dig', WR2: 'go', TE: 'seam' },
  Sail: { WR2: 'out', TE: 'corner', RB: 'flat' }, 'Out-Wheel': { WR2: 'out', RB: 'wheel', TE: 'seam' }, 'Corner-Flat': { WR1: 'corner', RB: 'flat', TE: 'hitch' },
  Choice: { TE: 'stick', WR1: 'go', WR2: 'out' }, 'PA Boot': { TE: 'drag', WR2: 'corner', RB: 'flat', WR1: 'go' }, 'Flood Boot': { WR2: 'out', TE: 'corner', RB: 'flat' },
  'PA Crossers': { WR1: 'cross', TE: 'drag', WR2: 'post' }, Mills: { WR2: 'post', WR1: 'dig', TE: 'seam' }, 'Four Verticals': { WR2: 'go', WR1: 'go', TE: 'seam', RB: 'seam' },
  'Verts Bender': { TE: 'post', WR2: 'go', WR1: 'go' }, 'PA Shot': { WR1: 'go', WR2: 'post', TE: 'drag' }, Yankee: { WR1: 'post', WR2: 'cross', TE: 'flat' },
  'Max Protect Go': { WR1: 'go', WR2: 'go' }, 'Post-Wheel': { WR2: 'post', RB: 'wheel', WR1: 'go' }, 'Go Route': { WR1: 'go', TE: 'stick', WR2: 'out' },
  'Double Move': { WR2: 'double', WR1: 'double' }, Sluggo: { WR1: 'double', WR2: 'slant', TE: 'stick' }, 'Corner-Post': { WR2: 'corner', WR1: 'post', TE: 'seam' },
  Seam: { TE: 'seam', WR2: 'go', WR1: 'hitch' }, 'Hail Mary': { WR1: 'go', WR2: 'go', TE: 'go' },
};

function byDepth(slot, d, n) { // no concept route: pick one that fits the depth, mixing inside and outside breaks
  const k = (n + slot.length) % 3;
  if (d <= 2) return 'flat';
  if (d <= 6) return ['slant', 'hitch', 'out'][k];
  if (d <= 12) return ['out', 'dig', 'hitch'][k];
  if (d <= 19) return ['dig', 'comeback', 'corner'][k];
  return ['go', 'post', 'corner'][k];
}

// The route for one receiver. concept: the play's concept name. slot: WR1/WR2/TE/RB. l0: where he lines up (yards from the
// middle). d: how deep he's caught or reads at. n: a per-play number for variety. Returns [[along, lat], ...].
export function routeFor(concept, slot, l0, d, n) {
  const out = l0 >= 0 ? 1 : -1;
  let name = CONCEPTS[concept]?.[slot] || byDepth(slot, d, n);
  if (DEEP.has(name) && d < 11) name = SHORTER[name] || 'hitch';
  else if (!DEEP.has(name) && name !== 'comeback' && d >= 17) name = LONGER[name] || 'go';
  if (name === 'screen' && d > 3) name = 'flat';
  return SHAPES[name](l0, Math.max(name === 'screen' ? -1 : 0, d), out).map(([al, lat]) => [al, Math.max(-25, Math.min(25, lat))]);
}
