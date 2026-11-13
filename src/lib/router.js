import { useEffect, useState } from 'react';

// Tiny hash router: '' = home, '#league', '#team-<id>' = roster, '#game-<id>' = a game (commissioner), '#coaching' = your coaching room, '#free-agents', '#data-check', '#login', '#control' (Commissioner's Desk; '#console' redirects to its Accounts tab).
export function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '');
  if (h.startsWith('team-')) return { page: 'team', id: h.slice(5) };
  if (h.startsWith('game-')) return { page: 'game', id: h.slice(5) };
  if (h === 'coaching') return { page: 'coaching' };
  if (h.startsWith('coaching-')) return { page: 'coaching', id: h.slice(9) };
  if (h === 'data-check') return { page: 'console' };
  if (h === 'live') return { page: 'live' };
  if (h === 'login') return { page: 'login' };
  if (h === 'console') return { page: 'console' };
  if (h === 'control') return { page: 'control' };
  if (h === 'control-accounts') return { page: 'control', tab: 'accounts' };
  if (h === 'league') return { page: 'league' };
  if (h === 'free-agents') return { page: 'freeAgents' };
  if (h === 'draft') return { page: 'draft' };
  if (h === 'trades') return { page: 'trades' };
  if (h.startsWith('my-')) return { page: 'home', tab: h.slice(3) };
  if (h === 'inbox') return { page: 'inbox' };
  if (h === 'draft-stage') return { page: 'draft', stage: true };
  if (h === 'draft-desk') return { page: 'draftDesk', stage: true };
  return { page: 'home' };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => { setRoute(parseHash(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const links = {
  home: '#home',
  league: '#league',
  team: (id) => `#team-${id}`,
  game: (id) => `#game-${id}`,
  coaching: (id) => (id ? `#coaching-${id}` : '#coaching'),
  live: '#live',
  login: '#login',
  console: '#console',
  control: '#control',
  accounts: '#control-accounts',
  freeAgents: '#free-agents',
  draft: '#draft',
  trades: '#trades',
  myTab: (tab) => `#my-${tab}`,
  inbox: '#inbox',
  draftStage: '#draft-stage',
  draftDesk: '#draft-desk',
};

// Where someone lands after logging in.
export function homeFor(profile) {
  if (profile?.role === 'commissioner') return links.control;
  return links.home;
}
