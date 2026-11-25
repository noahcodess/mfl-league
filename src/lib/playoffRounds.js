// The playoff rounds after the award ceremony (Week 13): which week each round is, its game kind and its name.
export const ROUNDS = [
  { week: 14, kind: 'quarterfinal', name: 'Quarterfinals', one: 'Quarterfinal', icon: '🏈' },
  { week: 15, kind: 'semifinal', name: 'Semifinals', one: 'Semifinal', icon: '🔥' },
  { week: 16, kind: 'craft_bowl', name: 'Craft Bowl', one: 'Craft Bowl', icon: '🏆' },
];
export const PLAYOFF_KINDS = ROUNDS.map((r) => r.kind);
export const isPlayoffGame = (g) => PLAYOFF_KINDS.includes(g?.kind);
export const roundOfWeek = (week) => ROUNDS.find((r) => r.week === week) || null;
export const roundOfGame = (g) => ROUNDS.find((r) => r.kind === g?.kind) || null;

// "Week 6" for a regular-season game, "Quarterfinal" / "Semifinal" / "Craft Bowl" for a playoff game.
export const gameWhen = (g) => roundOfGame(g)?.one || `Week ${g?.week}`;
