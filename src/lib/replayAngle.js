// Instant replay angles. The camera is always the same 2D side view, so an "angle" is what the replay follows and how
// tight it is: the ball (a great throw), the receiver from the start of his route (he got wide open), the defender the
// whole way (a pick, a breakup, a sack), or the runner (a big run, broken tackles). Picked per play with some chance in it,
// so the same kind of play doesn't always get the same replay.
const ZOOM = { ball: 1.6, route: 1.22, defender: 1.5, runner: 1.45 };
const ev = (p, type) => p.events.filter((e) => e.type === type);

// A steady 0-1 number per play and salt, so a rewind picks the same angle (never touches the scene's own dice).
const roll = (n, salt) => { let h = (n * 2654435761 + salt * 40503) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };

// Returns { focus, who, from, zoom } (from: when the replay should start, if the angle needs more than the moment itself).
export function replayAngle(S, play, key) {
  const r = roll(play.n, 7), cat = ev(play, 'catch')[0], thr = ev(play, 'throw')[0], sack = ev(play, 'pressure').find((e) => e.kind === 'sack');
  const tackles = ev(play, 'tackle'), broken = tackles.filter((e) => e.result === 'broken').length, made = tackles.find((e) => e.result === 'made');
  const pick = (focus, who, from) => ({ focus, who, from, zoom: ZOOM[focus] });
  if (cat?.result === 'int' || cat?.result === 'breakup') return r < 0.75 ? pick('defender', cat.def, key - 2.4) : pick('ball', null);
  if (sack) return r < 0.7 ? pick('defender', sack.by, S.T0 + 0.2) : pick('ball', null);
  if (made && play.result.gain < 0 && play.kind === 'run') return r < 0.6 ? pick('defender', made.def, key - 2.2) : pick('ball', null);
  if (cat?.result === 'catch') {
    const open = (cat.sep ?? 0) >= 2.2, tight = cat.contested || (cat.sep ?? 9) < 0.9;
    if (open && r < 0.65) return pick('route', cat.target, S.T0 + 0.2);   // he got wide open: start on the route
    if ((tight || (thr?.air ?? 0) >= 20) && r < 0.7) return pick('ball', null);   // the throw (and the catch in traffic)
    if (broken || play.result.gain - (thr?.air ?? 0) >= 12) return pick('runner', cat.target, key - 1);   // what he did after the catch
    return r < 0.5 ? pick('ball', null) : pick('runner', cat.target, key - 1.6);
  }
  const hand = ev(play, 'handoff')[0];
  if (hand && (broken || play.result.gain >= 12 || play.result.td)) return r < 0.65 ? pick('runner', hand.to, key - 3) : pick('ball', null);
  return pick('ball', null);
}
