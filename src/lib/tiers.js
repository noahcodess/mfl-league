// Player tiers for contract talks: stars barely budge, starters trade money for role and winning, depth is flexible.
export function tierOf(p) {
  if (p.stars >= 4.5) return { key: 'star', label: 'Franchise star', note: 'Barely moves on price. Short fuse with lowballs.' };
  if (p.stars >= 3.5) return { key: 'starter', label: 'Starter', note: 'Will trade some money for a starting job or a winning team.' };
  return { key: 'depth', label: 'Depth', note: 'Flexible on money and happy to stay.' };
}
