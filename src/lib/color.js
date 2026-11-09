// Color helpers: picks a team color that still shows up on the dark site.
function luminance(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Team primary color, unless it's too dark to see on the background; then its accent.
export function brandColors(team) {
  if (!team) return {};
  const dark = luminance(team.color) < 0.18;
  const brand = dark && luminance(team.accent) < 0.9 ? team.accent : team.color;
  return { '--brand': brand, '--brand-accent': team.accent };
}
