// Loads the team logo images from src/data/logos/ (file name = team id).
const files = import.meta.glob('./logos/*.png', { eager: true, import: 'default' });

const byId = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop().replace('.png', ''), url]),
);

export function logoFor(teamId) {
  return byId[teamId] || null;
}

// The MFL league logo: 'light' has white outlines for dark backgrounds.
export const leagueLogo = { dark: byId.mfl, light: byId['mfl-light'] };
