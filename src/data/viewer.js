// Who's looking right now (set once by App after login): their team and whether they're the commissioner. Lets any card
// decide what to hide (another team's Drip tab, potentials) without passing the viewer through every screen.
let current = null;
export const setViewer = (profile) => { current = profile || null; };
export const viewerTeam = () => (current?.role === 'coach' ? current.team_id || null : null);
export const viewerIsBoss = () => current?.role === 'commissioner' || !!current?.site_owner;
