// Opens a player's full card from anywhere on the site (trade screens, free agency). PlayerCardHost shows it.
export const openPlayerCard = (player) => window.dispatchEvent(new CustomEvent('mfl-card', { detail: player }));
