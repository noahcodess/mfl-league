// Who broadcasts a game and how it looks: the network (FOX and CBS split the day games, NBC and ESPN the nights), the show
// logo for primetime windows, and each network's colors for intros, transitions and graphics.
import { networkFor } from './games.js';

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

// { net, show (null for day games), prime, logo (show logo, else the network's MFL logo), title }
export function broadcastFor(game, homeTeam) {
  const net = NETS[networkFor(game.window, homeTeam)] || NETS.FOX, show = SHOWS[game.window] || null;
  return { net, show, prime: !!show, logo: show?.logo || net.logo, title: show?.name || `The MFL on ${net.name}` };
}
