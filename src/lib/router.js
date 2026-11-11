import { useEffect, useState } from 'react';

// Tiny hash router: '' = home, '#league', '#team-<id>' = roster, '#free-agents', '#data-check', '#login', '#console', '#control'.
export function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '');
  if (h.startsWith('team-')) return { page: 'team', id: h.slice(5) };
  if (h === 'data-check') return { page: 'dataCheck' };
  if (h === 'login') return { page: 'login' };
  if (h === 'console') return { page: 'console' };
  if (h === 'control') return { page: 'control' };
  if (h === 'league') return { page: 'league' };
  if (h === 'free-agents') return { page: 'freeAgents' };
  if (h === 'draft') return { page: 'draft' };
  if (h === 'trades') return { page: 'trades' };
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
  dataCheck: '#data-check',
  login: '#login',
  console: '#console',
  control: '#control',
  freeAgents: '#free-agents',
  draft: '#draft',
  trades: '#trades',
  inbox: '#inbox',
  draftStage: '#draft-stage',
  draftDesk: '#draft-desk',
};

// Where someone lands after logging in.
export function homeFor(profile) {
  if (profile?.role === 'commissioner') return links.console;
  return links.home;
}
