// What a game intro talks about: the player to watch (his best game last week, or the best player in the game before anyone
// has played), the crowd (always a sellout for now; bad teams will draw less later) and the weather at the stadium.

const score = (l) => (l.passYds || 0) / 25 + (l.passTD || 0) * 4 - (l.int || 0) * 2 + (l.rushYds || 0) / 10 + (l.rushTD || 0) * 6
  + (l.recYds || 0) / 10 + (l.recTD || 0) * 6 + (l.rec || 0) * 0.5 + (l.sacks || 0) * 3 + (l.defInt || 0) * 4;

function statTiles(l) {
  if (l.passYds) return [['Comp/Att', `${l.comp}/${l.att}`], ['Pass yds', l.passYds], ['TD', l.passTD], ['INT', l.int || 0]];
  if (l.rushYds) return [['Rush yds', l.rushYds], ['TD', l.rushTD || 0], ['Yds/carry', (l.rushYds / Math.max(8, Math.round(l.rushYds / 4.6))).toFixed(1)]];
  if (l.recYds) return [['Catches', l.rec], ['Rec yds', l.recYds], ['TD', l.recTD || 0]];
  return [['Sacks', l.sacks || 0], ['INT', l.defInt || 0]];
}

// season: { weeks }. playersOf(teamId) → roster. Returns { player, teamId, label, note, tiles }.
export function playerSpotlight(game, season, playersOf) {
  const prev = season?.weeks?.[game.week - 2];
  const lines = (prev?.games || []).filter((g) => g.status === 'final').flatMap((g) => g.lines || []).filter((l) => l.team === game.home || l.team === game.away);
  const best = lines.sort((a, b) => score(b) - score(a))[0];
  const find = (teamId, id) => playersOf(teamId).find((p) => p.id === id);
  if (best && find(best.team, best.id)) return { player: find(best.team, best.id), teamId: best.team, label: 'Player to watch', note: `Last week, Week ${game.week - 1}`, tiles: statTiles(best) };
  const all = [game.home, game.away].flatMap((t) => playersOf(t).filter((p) => p.status !== 'retired').map((p) => ({ p, t })));
  const top = all.sort((a, b) => b.p.stars - a.p.stars || (a.p.position === 'QB' ? -1 : 1))[0];
  if (!top) return null;
  return { player: top.p, teamId: top.t, label: 'Player to watch', note: 'Best player in this game', tiles: [['Rating', `${top.p.stars}★`], ['Position', top.p.position], ['Age', top.p.age ?? '?']] };
}

export const attendance = (capacity) => ({ count: capacity, full: true });

const CLIMATE = { // [low °F, high °F, day sky, night sky]
  snm: [14, 30, 'Light snow', 'Snow showers'], tga: [28, 44, 'Overcast', 'Flurries'], crf: [86, 99, 'Ember haze', 'Hot and hazy'],
  ntw: [98, 112, 'Falling ash', 'Falling ash'], wrf: [68, 79, 'Drifting spores', 'Glowing spores'], dst: [92, 106, 'Sunny', 'Clear and warm'],
  ocn: [62, 74, 'Breezy', 'Sea breeze'], ocm: [58, 70, 'Light rain', 'Drizzle'], lsc: [72, 72, 'Under the dome', 'Under the dome'],
  ddc: [44, 52, 'Dark skies', 'Pitch black'], edc: [50, 60, 'Clear', 'Starry'], void: [40, 55, 'Clear', 'Starry'], pln: [66, 80, 'Sunny', 'Clear'],
  flf: [64, 76, 'Sunny', 'Clear'], drf: [46, 58, 'Foggy', 'Thick fog'], wsl: [76, 90, 'Dusty', 'Dust in the air']
};
const ICON = (sky) => (/snow|flurr/i.test(sky) ? '❄️' : /rain|drizzle/i.test(sky) ? '🌧️' : /fog|dark|black/i.test(sky) ? '🌫️' : /ash|ember|haze|dust|spore/i.test(sky) ? '🔥' : /dome/i.test(sky) ? '🏟️' : /star|clear/i.test(sky) ? '🌙' : '☀️');

export function gameWeather(game, night) {
  const [lo, hi, day, eve] = CLIMATE[game.home] || [55, 70, 'Clear', 'Clear'];
  const seed = [...String(game.id)].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) >>> 0;
  const sky = night ? eve : day, temp = Math.round(lo + (seed % 100) / 100 * (hi - lo)) - (night ? 4 : 0);
  return { temp, sky, wind: 3 + (seed % 13), icon: night && /clear|sunny/i.test(sky) ? '🌙' : ICON(sky) };
}
