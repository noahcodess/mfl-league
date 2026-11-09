import { useEffect, useState } from 'react';

// Tiny hash router: '' = league, '#team-<id>' = team page, '#data-check' = data check.
export function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '');
  if (h.startsWith('team-')) return { page: 'team', id: h.slice(5) };
  if (h === 'data-check') return { page: 'dataCheck' };
  return { page: 'league' };
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
  league: '#league',
  team: (id) => `#team-${id}`,
  dataCheck: '#data-check',
};
