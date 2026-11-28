// Who broadcasts a game and how it looks: the network (FOX and CBS split the day games, NBC and ESPN the nights), the show
// logo for primetime windows, and each network's colors for intros, transitions and graphics. Playoff games air on a
// network's main broadcast (NBC = its Sunday night look, ESPN = its Saturday/Monday night look; TNF never airs playoffs)
// and always wear the network's own logo, even if the commissioner put one on a show like Saturday Night.
import { networkFor } from './games.js';
import { isPlayoffGame, roundOfGame } from '../lib/playoffRounds.js';

const files = import.meta.glob('./broadcast/*.png', { eager: true, import: 'default' });
const img = (n) => files[`./broadcast/${n}.png`];

export const NETS = {
  FOX: { key: 'fox', name: 'FOX', logo: img('fox-mfl'), pixels: ['#f4b800', '#ffd84a', '#111111', '#ffffff', '#c98f00'] },
  CBS: { key: 'cbs', name: 'CBS', logo: img('cbs-mfl'), pixels: ['#0b3a82', '#1f5fc4', '#ffffff', '#9fc0ff', '#06245a'] },
  NBC: { key: 'nbc', name: 'NBC', logo: img('nbc'), pixels: ['#fcb711', '#f37021', '#cc004c', '#6460aa', '#0089d0', '#0db14b'] },
  ESPN: { key: 'espn', name: 'ESPN', logo: img('espn'), pixels: ['#d10f0f', '#ff3b3b', '#2b333b', '#ffffff', '#7a0909'] },
};

const SHOWS = {
  thu_night: { key: 'tnf', name: 'Thursday Night Football', logo: img('tnf') },
  sat_night: { key: 'stnf', name: 'Saturday Night Football', logo: img('stnf') },
  sun_night: { key: 'snf', name: 'Sunday Night Football', logo: img('snf') },
  mon_night: { key: 'mnf', name: 'Monday Night Football', logo: img('mnf') },
};

// The Craft Bowl's colors: gold transitions (and gold trim on the scorebug, set by bc.gold).
const GOLD = ['#ffd84a', '#f5c518', '#c9a227', '#fff3b0', '#8a6a10', '#ffe98a'];

// Each network's main broadcast, used when a playoff game is given just the network.
const MAIN = { nbc: 'sun_night', espn: 'mon_night' };

// Scorebug designs: FOX, CBS, TNF and SNF each have their own; ESPN's is shared by Saturday Night and Monday Night.
const BUG = { tnf: 'tnf', snf: 'snf', stnf: 'espn', mnf: 'espn' };

// { net, show (null for day games), prime, logo (show logo, else the network's MFL logo), title, bug (scorebug design),
//   gold (the Craft Bowl), playoff }
export function broadcastFor(game0, homeTeam) {
  const dev = import.meta.env.DEV && typeof window !== 'undefined' && /[?&]devnet=([a-z_]+)/.exec(window.location.search)?.[1], game = dev ? { ...game0, window: dev } : game0;   // dev only: ?devnet=sun_night
  const net0 = NETS[networkFor(game.window, homeTeam)] || NETS.FOX, playoff = isPlayoffGame(game), gold = game.kind === 'craft_bowl';
  const net = gold ? { ...net0, pixels: GOLD, gold: true } : net0;
  let show = SHOWS[game.window] || SHOWS[MAIN[game.window]] || null;
  if (show && playoff) show = { ...show, logo: net.logo, name: `${roundOfGame(game).one} on ${net.name}` };   // the network's logo, never the show's
  const title = playoff ? `The MFL Playoffs on ${net.name}` : show?.name || `The MFL on ${net.name}`;
  return { net, show, prime: !!show, logo: show?.logo || net.logo, title, bug: BUG[show?.key] || net.key, gold, playoff };
}
