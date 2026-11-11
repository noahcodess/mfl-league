// Test-only trades so the trade screens can be screenshotted offline.
import { store } from './store.js';

export function demoTrades() {
  const of = (team, n) => store.league.players.filter((p) => p.teamId === team).sort((a, b) => b.stars - a.stars).slice(0, n);
  const pick = (team, season, round) => ({ id: `${team}${season}${round}`, season, round, originalCode: team.toUpperCase(), ownerId: team });
  const item = (side, x) => (x.position ? { id: `${side}-${x.id}`, side, player: x, pick: null } : { id: `${side}-${x.id}`, side, player: null, pick: x });
  return [
    { id: 5, season: 8, from: 'snm', to: 'ntw', status: 'pending', note: null, createdAt: new Date().toISOString(), botAt: new Date().toISOString(),
      give: [pick('snm', 9, 1)].map((x) => item('give', x)), get: of('ntw', 1).map((x) => item('get', x)) },
    { id: 4, season: 8, from: 'snm', to: 'ocn', status: 'declined', note: null, createdAt: new Date().toISOString(), decidedBy: 'bot',
      botVerdict: { accept: false, reasons: ["We're rebuilding. Picks and young talent matter most to us.", "Not enough coming back. We'd want about a 3.0★ player or a 3rd-round pick more."] },
      give: [pick('snm', 8, 3)].map((x) => item('give', x)), get: of('ocn', 1).map((x) => item('get', x)) },
    { id: 3, season: 8, from: 'crf', to: 'snm', status: 'pending', note: 'Need a QB, can talk.', createdAt: new Date().toISOString(),
      give: [...of('crf', 1), pick('crf', 9, 2)].map((x) => item('give', x)), get: of('snm', 1).map((x) => item('get', x)) },
    { id: 2, season: 8, from: 'snm', to: 'lsc', status: 'pending', note: null, createdAt: new Date().toISOString(),
      give: of('snm', 3).slice(1).map((x) => item('give', x)), get: [pick('lsc', 9, 1)].map((x) => item('get', x)) },
    { id: 1, season: 8, from: 'dst', to: 'wrf', status: 'accepted', note: null, createdAt: new Date().toISOString(), decidedBy: 'coach',
      give: of('dst', 1).map((x) => item('give', x)), get: of('wrf', 1).map((x) => item('get', x)) },
  ];
}
